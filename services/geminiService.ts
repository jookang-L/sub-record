
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
      text: `[지식 베이스: 사용자 정의 참조 자료]\n아래 파일 내용 참고하여 작성.`
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
        '진로 (2).pdf'
      ];
    }

    parts.push({
      text: `[지식 베이스: ${params.recordType} 활동 참조 자료]\n아래 PDF 파일들의 문체 참고.`
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
      text: `[지식 베이스: 교육과정 성취기준 및 우수 세특 예시]
아래 자료의 문체와 평가 방식을 참고하여 작성. 성취기준 번호는 출력하지 말 것.

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

  // Determine Character Limit (공백 포함 글자 수)
  // 모든 페이지 공통: 1등급 600~650자, 2등급 500~600자, 3등급 400~500자
  let limitMin = 400;
  let limitMax = 650;
  let strictLimitMsg = "";

  switch (params.gradeLevel) {
    case GradeLevel.GRADE_1:
      limitMin = 600;
      limitMax = 650;
      break;
    case GradeLevel.GRADE_2:
      limitMin = 500;
      limitMax = 600;
      break;
    case GradeLevel.GRADE_3:
      limitMin = 400;
      limitMax = 500;
      break;
    default:
      limitMin = 600;
      limitMax = 650;
  }

  strictLimitMsg = `글자 수 ${limitMin}~${limitMax}자 (공백 포함) 절대 엄수. 범위 벗어나면 반드시 조정.`;

  // 4. Add User Inputs & Final Constraints
  // 등급별 분량 설명
  const volumeDesc = params.gradeLevel === GradeLevel.GRADE_1 
    ? "충분히 상세하고 풍부한 내용" 
    : params.gradeLevel === GradeLevel.GRADE_2 
    ? "적절히 구체적인 내용"
    : "핵심 위주의 간결한 내용";

  let promptText = `
[사용자 입력 정보]
- 희망 등급: ${params.gradeLevel} (${volumeDesc})
${params.customSubjectName ? `- 활동 분야/교과명: ${params.customSubjectName}` : ''}
- 1차 초안 및 메모: ${params.draftText || "(없음. 보고서와 코드를 바탕으로 작성)"}

[목표 분량 - 절대 필수]
전체 텍스트는 반드시 정확히 ${limitMin}~${limitMax}자 (공백 포함)로 작성해야 함.
- 최소: ${limitMin}자 (이보다 짧으면 안 됨)
- 최대: ${limitMax}자 (이보다 길면 안 됨)
- 참고: 대략 A4 용지 ${(limitMin/350).toFixed(1)}~${(limitMax/350).toFixed(1)}줄 분량
- 완성 후 반드시 글자 수를 세어 범위 내인지 확인할 것
- 범위 벗어나면 반드시 수정하여 범위 내로 맞출 것

[문장 작성 규칙 - 필수]
1. 종결어미: 모든 문장은 '-함', '-보임', '-임'으로만 끝낼 것. '-합니다', '-입니다' 절대 금지.

2. 문장 길이: 짧은 문장 금지. 2-3개 절을 연결하여 길게 작성.
   나쁜 예: "이는 문제 해결력을 보여줌. 창의적 접근을 보임."
   좋은 예: "이는 문제 해결력을 보여줌과 동시에 창의적 접근 방식을 엿볼 수 있었음."
   연결 표현: '~과 동시에', '~한편', '~뿐만 아니라', '~더불어'

3. 문장 간 연결: 문장 사이에 연결어 필수 사용.
   연결어: '이 과정에서', '따라서', '나아가', '이는', '특히', '이를 통해', '이를 바탕으로'

[최종 검증 - 반드시 확인]
✓ 전체 글자 수: 정확히 ${limitMin}~${limitMax}자인가? (공백 포함)
✓ 모든 문장: '-함', '-보임', '-임'으로 끝나는가?
✓ 문장 길이: 충분히 길고 여러 절을 포함하는가?
✓ 연결어: 자연스럽게 사용되었는가?

글자 수가 ${limitMin}자 미만이면 내용 추가, ${limitMax}자 초과하면 축약하여 반드시 범위 내로 맞출 것!
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
            gradeVersion: { type: Type.STRING, description: `${limitMin}~${limitMax}자 (공백 포함) 분량의 텍스트. 짧은 문장을 피하고 2-3개 절을 연결하여 길게 작성. 모든 문장은 '-함', '-보임', '-임'으로만 끝내고 '-합니다', '-입니다' 사용 금지. 문장 간 연결어('이 과정에서', '나아가', '이를 통해' 등) 사용하여 자연스러운 흐름 유지.` },
          },
          required: ["gradeVersion"],
        },
        temperature: 0.3
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
          text: `다음 텍스트의 맞춤법과 띄어쓰기를 교정. 학생 지칭, 성취기준 번호, 섹션 헤더는 삭제. 문맥과 전문 용어는 유지하고 오타만 수정:\n\n${text}`
        }]
      }
    ]
  });

  return response.text || text;
};

export const summarizeText = async (text: string, targetLength: number, apiKey: string): Promise<string> => {
  if (!apiKey) throw new Error("API 키가 필요합니다.");

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    config: {
      responseMimeType: 'text/plain',
      temperature: 0.3,
    },
    contents: [
      {
        role: 'user',
        parts: [{
          text: `다음 텍스트를 ${targetLength}자 (공백 포함) 이하로 자연스럽게 축약해줘.

[절대 금지 사항]
1. 학생 지칭 금지: '위 학생은', '해당 학생은', '학습자는', '학생은' 등 절대 미포함. 주어 생략하고 서술어로 시작.
2. 성취기준 번호 금지: [12정01-01] 같은 코드 절대 미포함.
3. 괄호 사용 금지: 날짜 표기 외 괄호 사용 금지.
4. 따옴표 최소화: 교과명, 프로젝트명만 사용.
5. 종결어미 제한: 반드시 '-함', '-보임', '-임'으로만 끝내야 함. '-합니다', '-입니다' 절대 금지.
6. 섹션 헤더 금지: '탐구 동기', '탐구 과정' 등 미포함.
7. **교사 관점 필수**: 학생의 내면(깨달음, 느낌, 다짐)을 단정 금지. 관찰 기반 추측 표현만 사용.
   - 절대 금지: "깨달음", "계기가 되었음", "느꼈음", "다짐함", "결심함"
   - 필수 사용: "~으로 보임", "~것으로 판단됨", "~한 것으로 파악됨", "~계기가 된 것으로 보임"

[축약 규칙]
1. 글자 수: 반드시 ${targetLength}자 (공백 포함) 이하로 축약
2. 핵심 내용 유지: 탐구 주제, 방법, 결과, 평가는 반드시 포함
3. 결론 부분 보존: 평가 및 의미 부여는 꼭 유지
4. 문장 길이: 짧은 문장 금지. 2-3개 절을 연결하여 길게 작성.
   - 나쁜 예: "~보여줌. ~보임." (짧고 단절적)
   - 좋은 예: "~보여줌과 동시에 ~엿볼 수 있었음." (길고 자연스러움)
5. 연결 표현 필수: '~과 동시에', '~한편', '~뿐만 아니라', '~더불어', '~나아가'
6. 문장 간 연결어: '이 과정에서', '따라서', '나아가', '이는', '특히', '이를 통해', '이를 바탕으로'

[원본 텍스트]
${text}

위 규칙을 모두 준수하여 ${targetLength}자 이하로 축약한 결과만 출력:`
        }]
      }
    ]
  });

  return response.text || text;
};
