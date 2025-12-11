
import { GoogleGenAI, Type } from "@google/genai";
import { GenerationParams, GeneratedResult, GradeLevel, RecordType } from "../types";
import { getSystemInstruction } from "../constants";
import { getAutonomySystemInstruction } from "../autonomyConstants";
import { CURRICULUM_AI_BASICS, CURRICULUM_INFORMATICS, STUDENT_RECORD_EXAMPLES } from "../referenceData";

// Helper to sanitize base64 strings (remove data URL prefix if present)
const getBase64Data = (dataUrl: string): string => {
  if (dataUrl.includes(',')) {
    return dataUrl.split(',')[1];
  }
  return dataUrl;
};

export const generateStudentReport = async (params: GenerationParams, apiKey: string): Promise<GeneratedResult> => {
  if (!apiKey) {
    throw new Error("API 키가 설정되지 않았습니다. 왼쪽 상단의 열쇠 아이콘을 눌러 API 키를 입력해주세요.");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Prepare contents array
  const parts: any[] = [];

  // 1. Inject Knowledge Base
  if (params.customKnowledgeBase && params.customKnowledgeBase.length > 0) {
    // Only PDF files are supported for custom knowledge base (but array is allowed now)
    parts.push({
      text: `[지식 베이스: 사용자 정의 참조 자료]\\n작성 시 다음 파일들의 내용을 반드시 참고하시오.`
    });

    params.customKnowledgeBase.forEach((kbFile) => {
      parts.push({
        inlineData: {
          mimeType: kbFile.mimeType,
          data: getBase64Data(kbFile.data)
        }
      });
    });
  } else if (params.recordType) {
    // For autonomy/career/club pages, load specific default PDFs from public folder
    let pdfFiles: string[] = [];

    if (params.recordType === RecordType.CLUB) {
      pdfFiles = [
        '동아리 (1).pdf',
        '동아리 (2).pdf',
        '동아리 (3).pdf',
        '동아리 (4).pdf'
      ];
    } else if (params.recordType === RecordType.BEHAVIOR) {
      // For behavior pages
      pdfFiles = [
        '행특 (1).pdf'
      ];
    } else {
      // For autonomy/career pages
      pdfFiles = [
        '자율 (1).pdf',
        '자율 (2).pdf',
        '진로 (1).pdf',
        '진로 (2).pdf',
        '진로 (3).pdf',
        '진로 (4).pdf'
      ];
    }

    parts.push({
      text: `[지식 베이스: 기본 참조 자료 (${params.recordType} 활동)]\\n작성 시 다음 PDF 파일들의 내용과 문체를 반드시 참고하시오.`
    });

    // Load each PDF file from public folder
    for (const pdfFile of pdfFiles) {
      try {
        const response = await fetch(`/${pdfFile}`);
        if (response.ok) {
          const blob = await response.blob();
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const dataUrl = reader.result as string;
              resolve(getBase64Data(dataUrl));
            };
            reader.readAsDataURL(blob);
          });

          parts.push({
            inlineData: {
              mimeType: 'application/pdf',
              data: base64
            }
          });
        }
      } catch (error) {
        console.warn(`Failed to load ${pdfFile}:`, error);
      }
    }
  } else {
    // Default for subject pages (교과세특)
    parts.push({
      text: `
      [지식 베이스: 고정 참조 자료]
      작성 시 다음의 교육과정 성취기준과 우수 사례를 반드시 참고하시오.
      단, **성취기준 번호(예: [12정02-04])는 절대 출력물에 포함하지 마십시오.** 내용은 녹여내되 코드는 표기하지 마십시오.
      이 데이터베이스에 있는 문체와 평가 방식(구체적 알고리즘 명시, 데이터 출처 언급, 문제해결 과정 서술 등)을 철저히 벤치마킹하여 작성할 것.
      
      ${CURRICULUM_INFORMATICS}
      
      ${CURRICULUM_AI_BASICS}
      
      ${STUDENT_RECORD_EXAMPLES}
      `
    });
  }

  // 2. Add Report Files
  params.reportFiles.forEach((file) => {
    if (file.type.startsWith('image/') || file.type === 'application/pdf') {
      parts.push({
        inlineData: {
          mimeType: file.type,
          data: getBase64Data(file.data),
        },
      });
    } else {
      parts.push({
        text: `[학생 보고서 파일 내용: ${file.name}]\n${file.data}`,
      });
    }
  });

  // 3. Add Code Files
  params.codeFiles.forEach((file) => {
    parts.push({
      text: `[학생 코드 파일 내용: ${file.name}]\n${file.data}`,
    });
  });

  // Determine Byte Limit Strategy (바이트 기준: 한글 3byte, 그 외 1byte)
  // 모든 페이지 공통: 1등급 1450~1500, 2등급 1300~1400, 3등급 1000~1300
  let limitMin = 1000;
  let limitMax = 1500;
  let strictLimitMsg = "";

  switch (params.gradeLevel) {
    case GradeLevel.GRADE_1:
      limitMin = 1450;
      limitMax = 1500;
      break;
    case GradeLevel.GRADE_2:
      limitMin = 1300;
      limitMax = 1400;
      break;
    case GradeLevel.GRADE_3:
      limitMin = 1000;
      limitMax = 1300;
      break;
    default:
      limitMin = 1450;
      limitMax = 1500;
  }

  strictLimitMsg = `🚨🚨🚨 절대 규칙 (최우선 준수) 🚨🚨🚨
반드시 ${limitMin}~${limitMax}byte 범위 내에서 작성하시오.
• 바이트 계산: 한글(자음/모음 포함)=3byte, 숫자/영문/공백/특수문자/줄바꿈=1byte
• 예시: "김개똥은 책임감이 강하고 협업을 잘함." = 한글48 + 공백4 + 마침표1 = 53byte
• ${limitMax}byte를 1byte라도 초과하면 절대 안 됨!
• 만약 초과할 것 같으면 수식어, 부사, 형용사를 삭제하시오.
• 내용이 부족해 보여도 ${limitMin}byte 이상만 되면 괜찮음.`;

  // 4. Add User Inputs & Final Constraints
  let promptText = `
    [사용자 입력 정보]
    1. 희망 등급: ${params.gradeLevel}
    ${params.customSubjectName ? `2. 활동 분야/교과명: ${params.customSubjectName}` : ''}
    ${params.customSubjectName ? '3' : '2'}. 1차 교과세특 초안 및 메모:
    ${params.draftText || "(없음. 보고서와 코드를 바탕으로 새로 작성)"}
    
    [★★최종 생성 전 필수 검증(Sanity Check)★★]
    텍스트를 생성하기 직전에 다음 규칙을 적용하여 스스로 내용을 수정하시오:
    1. ❌ **이름 및 지칭 삭제**: 텍스트에 학생 이름(예: 홍길동)이 포함되어 있다면 무조건 삭제하시오. **'위 학생은', '해당 학생은', '학습자는', '학생은' 등의 표현도 절대 남기지 마시오.** (주어 생략 권장)
    2. ❌ **성취기준 코드 삭제**: 텍스트에 [12정01-01] 같은 코드가 있다면 무조건 삭제하시오.
    3. ❌ **괄호() 사용 금지**: 텍스트에 괄호 '()'가 있다면 삭제하거나 다른 표현으로 바꾸시오. **단, 날짜 표기(예: (2025.12.09.))를 위한 괄호는 허용하며 절대 삭제하지 마시오.** 그 외 '딕셔너리(item)' 같은 표현은 '딕셔너리 item'으로 변경하시오.
    4. ❌ **따옴표 사용 최소화**: 작은따옴표나 큰따옴표는 교과명, 프로젝트명 등 특별한 경우에만 사용하고, 그 외에는 사용하지 마시오.
    5. ❌ **바이트 수 조절 (문맥 자연스러움 필수)**: 
       👉 ${strictLimitMsg}
       
       ⚠️ 바이트 초과 시 조절 방법 (반드시 이 순서로):
       1️⃣ **문맥 유지하며 구조 재구성**: 단순 나열 문장을 통합하고 연결어로 자연스럽게 연결
          • 나쁜 예: "~구현함. 입력된 물건들을~" (연결어 없음, 단순 나열)
          • 좋은 예: "~구현함. 이를 바탕으로 입력된 물건들을~" (연결어로 자연스러운 흐름)
          • 연결어 활용: '이는', '특히', '또한', '이를 통해', '나아가', '이를 바탕으로' 등
       2️⃣ **불필요한 수식어만 제거**: 문맥에 영향 없는 형용사, 부사만 조심스럽게 삭제
       3️⃣ **최종 검토**: 전체를 읽어보고 논리적 흐름과 문장 간 연결이 자연스러운지 확인
       4️⃣ **${limitMin}~${limitMax}byte 범위 확인**: 최종 바이트가 범위 내인지 검증
    6. ❌ **섹션 헤더 삭제**: '탐구 동기', '탐구 과정', '탐구 결과', '평가 및 피드백' 등의 단어가 포함되어 있다면 삭제하고 자연스러운 줄글로 이으시오.
    
    위 규칙을 완벽히 지킨 최종 결과만 JSON으로 출력하시오.
  `;

  parts.push({ text: promptText });

  try {
    // Determine subject name: use custom subject name if provided, otherwise default to "정보"
    const subjectName = params.customSubjectName || "정보";

    // Choose the appropriate system instruction based on recordType
    const systemInstruction = params.recordType
      ? getAutonomySystemInstruction(params.recordType, subjectName)
      : getSystemInstruction(subjectName);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            gradeVersion: { type: Type.STRING, description: `${limitMin}~${limitMax}byte 범위(한글 3byte, 그 외 1byte)를 절대 준수한 텍스트. ${limitMax}byte 초과 시 연결어('이는', '특히', '이를 통해', '나아가' 등)를 활용하여 문맥을 자연스럽게 유지하며 범위 내로 조절할 것. 단순 나열식 문장 연결 금지. (학생 이름, 성취기준 번호, 섹션 헤더, 괄호, 불필요한 따옴표 절대 미포함)` },
          },
          required: ["gradeVersion"],
        }
      },
      contents: [
        {
          role: 'user',
          parts: parts
        }
      ]
    });

    const resultText = response.text;
    if (!resultText) throw new Error("생성된 결과가 없습니다.");

    return JSON.parse(resultText) as GeneratedResult;

  } catch (error: any) {
    console.error("Gemini Generation Error:", error);
    if (error.message && error.message.includes("API key")) {
      throw new Error("유효하지 않은 API 키입니다. 다시 확인해주세요.");
    }
    throw new Error("세특 생성 중 오류가 발생했습니다: " + (error.message || "알 수 없는 오류"));
  }
};

export const checkSpelling = async (text: string, apiKey: string): Promise<string> => {
  if (!apiKey) throw new Error("API 키가 필요합니다.");

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    config: {
      responseMimeType: 'text/plain',
    },
    contents: [
      {
        role: 'user',
        parts: [{
          text: `다음 텍스트의 맞춤법과 띄어쓰기를 교정해줘. 
        단, 다음 규칙을 엄수해줘:
        1. 학생 이름, '위 학생은', '해당 학생은' 등의 지칭 대명사 삭제.
        2. '[12정00-00]' 같은 성취기준 번호 삭제.
        3. '탐구 동기', '탐구 과정' 등의 섹션 헤더 삭제.
        문맥과 전문 용어는 유지하고, 오타나 문법적 오류만 수정해서 결과 텍스트만 출력해:\n\n${text}`
        }]
      }
    ]
  });

  return response.text || text;
};
