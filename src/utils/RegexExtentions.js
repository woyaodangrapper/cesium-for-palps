RegExp.prototype.getWordsBetween = function(text) {
  var matches = [];
  var match;
  var pattern = /\b(\w+)\b/g; // 匹配单词的正则表达式

  while ((match = pattern.exec(text)) !== null) {
    matches.push(match[1]);
  }

  return matches;
};