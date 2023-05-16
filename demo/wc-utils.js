// Dummy functions so that we can get syntax highlighting with common VSCode extensions

export function html(strings, ...values) {
  return values.reduce((finalString, value, index) => {
    return `${finalString}${value}${strings[index + 1]}`
  }, strings[0])
}

export function css(strings, ...values) {
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(values.reduce((finalString, value, index) => {
    return `${finalString}${value}${strings[index + 1]}`
  }, strings[0]));
  return sheet;
}