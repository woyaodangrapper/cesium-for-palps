module.exports = {
  defaultSeverity: 'error',
  extends: ['stylelint-config-prettier'],
  plugins: ['stylelint-less'],
  overrides: [
    {
      files: ['**/*.html'],
      customSyntax: 'postcss-html',
    },
    {
      files: ['**/*.less'],
      customSyntax: 'postcss-less',
    },
  ],
};
