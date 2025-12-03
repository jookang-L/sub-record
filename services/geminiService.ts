
import { GoogleGenAI, Type } from "@google/genai";
import { GenerationParams, GeneratedResult, GradeLevel } from "../types";
import { SYSTEM_INSTRUCTION } from "../constants";
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
  if (params.customKnowledgeBase) {
    if (params.customKnowledgeBase.mimeType === 'application/pdf') {
      parts.push({
        text: `[지식 베이스: 사용자 정의 참조 자료 (PDF)]\n작성 시 다음 PDF 파일의 내용을 반드시 참고하시오.`
      });
      parts.push({
        inlineData: {
          mimeType: params.customKnowledgeBase.mimeType,
          data: getBase64Data(params.customKnowledgeBase.data)
        }
      });
    } else {
      parts.push({
        text: `
        [지식 베이스: 사용자 정의 참조 자료]
        작성 시 다음의 내용을 반드시 참고하시오.
        단, **성취기준 번호(예: [12정02-04])는 절대 출력물에 포함하지 마십시오.** 내용은 녹여내되 코드는 표기하지 마십시오.
        이 데이터베이스에 있는 문체와 평가 방식(구체적 알고리즘 명시, 데이터 출처 언급, 문제해결 과정 서술 등)을 철저히 벤치마킹하여 작성할 것.
        
        ${params.customKnowledgeBase.data}
        `
      });
    }
  } else {
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

  // Determine Character Limit Strategy
  let limitChars = 650;
  let strictLimitMsg = "";

  switch (params.gradeLevel) {
    case GradeLevel.GRADE_1: // Limit 650
      limitChars = 650;
      strictLimitMsg = `🚨 절대 규칙: 공백 포함 ${limitChars}자를 절대 넘기면 안 됨.`;
      break;
    case GradeLevel.GRADE_2: // Limit 550
      limitChars = 550;
      strictLimitMsg = `🚨 절대 규칙: 공백 포함 ${limitChars}자를 절대 넘기면 안 됨.`;
      break;
    case GradeLevel.GRADE_3: // Limit 450
      limitChars = 450;
      strictLimitMsg = `🚨 절대 규칙: 공백 포함 ${limitChars}자를 절대 넘기면 안 됨.`;
      break;
    default:
      limitChars = 650;
      strictLimitMsg = "적절한 분량으로 작성하시오.";
  }

  // 4. Add User Inputs & Final Constraints
  let promptText = `
    [사용자 입력 정보]
    1. 희망 등급: ${params.gradeLevel}
    2. 1차 교과세특 초안 및 메모:
    ${params.draftText || "(없음. 보고서와 코드를 바탕으로 새로 작성)"}
    
    [★★최종 생성 전 필수 검증(Sanity Check)★★]
    텍스트를 생성하기 직전에 다음 규칙을 적용하여 스스로 내용을 수정하시오:
    1. ❌ **이름 및 지칭 삭제**: 텍스트에 학생 이름(예: 홍길동)이 포함되어 있다면 무조건 삭제하시오. **'위 학생은', '해당 학생은', '학습자는', '학생은' 등의 표현도 절대 남기지 마시오.** (주어 생략 권장)
    2. ❌ **성취기준 코드 삭제**: 텍스트에 [12정01-01] 같은 코드가 있다면 무조건 삭제하시오.
    3. ❌ **괄호() 사용 금지**: 텍스트에 괄호 '()'가 있다면 무조건 삭제하거나 다른 표현으로 바꾸시오. 예를 들어 '딕셔너리(item)'는 '딕셔너리 item'으로 변경하시오.
    4. ❌ **따옴표 사용 최소화**: 작은따옴표나 큰따옴표는 교과명, 프로젝트명 등 특별한 경우에만 사용하고, 그 외에는 사용하지 마시오.
    5. ❌ **글자 수 강제 조절**: 
       👉 ${strictLimitMsg}
       (만약 생성된 텍스트가 이 제한을 넘을 것 같으면, 부사나 형용사를 과감히 삭제하여 길이를 줄이시오. 내용이 잘리더라도 제한을 지키는 것이 우선입니다.)
    6. ❌ **섹션 헤더 삭제**: '탐구 동기', '탐구 과정', '탐구 결과', '평가 및 피드백' 등의 단어가 포함되어 있다면 삭제하고 자연스러운 줄글로 이으시오.
    
    위 규칙을 완벽히 지킨 최종 결과만 JSON으로 출력하시오.
  `;

  parts.push({ text: promptText });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            gradeVersion: { type: Type.STRING, description: `공백 포함 ${limitChars}자 이하(절대 넘지 말 것)로 작성된 버전 (학생 이름, 성취기준 번호, 섹션 헤더, 괄호, 불필요한 따옴표 절대 미포함)` },
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
