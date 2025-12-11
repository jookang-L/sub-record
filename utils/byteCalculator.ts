// NEIS 바이트 계산 함수
// 한글(자음·모음 포함): 3byte
// 숫자, 영문, 특수문자, 공백, 줄바꿈: 1byte
export function neisByteLength(str: string): number {
  let bytes = 0;

  for (const ch of str) {
    const code = ch.codePointAt(0);
    if (code === undefined) continue;

    const isHangul =
      (code >= 0xac00 && code <= 0xd7a3) || // 완성형 한글
      (code >= 0x1100 && code <= 0x11ff) || // 자모
      (code >= 0x3130 && code <= 0x318f);   // 호환 자모

    bytes += isHangul ? 3 : 1;
  }

  return bytes;
}

