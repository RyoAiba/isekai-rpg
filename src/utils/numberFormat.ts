const HALF_WIDTH_DIGITS = /[0-9]/g

export function toFullWidthNumber(value: number | string) {
  return String(value).replace(HALF_WIDTH_DIGITS, (digit) =>
    String.fromCharCode(digit.charCodeAt(0) + 0xfee0),
  )
}

export function toFullWidthPaddedNumber(value: number, width: number) {
  return toFullWidthNumber(String(value).padStart(width, ' ')).replace(/ /g, '　')
}

export function toFullWidthSignedNumber(value: number) {
  return value > 0 ? `+${toFullWidthNumber(value)}` : toFullWidthNumber(value)
}
