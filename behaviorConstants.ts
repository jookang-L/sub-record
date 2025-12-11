
import { GradeLevel } from "./types";

export const BEHAVIOR_GRADE_DESCRIPTIONS: Record<GradeLevel, string> = {
    [GradeLevel.GRADE_1]: "매우 상세, 풍부한 내용 (1450~1500byte)",
    [GradeLevel.GRADE_2]: "적절히 구체적, 적절한 내용 (1300~1400byte)",
    [GradeLevel.GRADE_3]: "핵심 내용 위주, 요약된 내용 (1000~1300byte)",
};
