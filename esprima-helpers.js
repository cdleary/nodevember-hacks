// Helper functions for dealing with esprima parse nodes.

exports.isIdentifier = function isIdentifier(node) {
  return node.type === 'ExpressionStatement' &&
    node.expression.type === 'Identifier';
}

exports.isLiteral = function isLiteral(node) {
  return node.type === 'Literal' ||
      (node.type === 'ExpressionStatement' &&
       node.expression.type === 'Literal');
};

exports.getRawLiteral = function getRawLiteral(node) {
  if (node.type === 'Literal') {
    return node.raw;
  }
  return node.expression.raw;
};

exports.getIdentifier = function getIdentifier(node) {
  if (node.type === 'ExpressionStatement') {
    return getIdentifier(node.expression);
  }
  if (node.type === 'BinaryExpression' &&
      node.operator === '-') {
    return getIdentifier(node.left) + '-' + getIdentifier(node.right);
  }
  if (node.type !== 'Identifier') {
    throw new Error('node is not an identifier: ' + JSON.stringify(node));
  }
  return node.name;
};

exports.isTargetIdentifier = function isTargetIdentifier(node, target) {
  return exports.isIdentifier(node) && exports.getIdentifier(node) === target;
};

exports.isExprStmt = function isExprStmt(node) {
  return node.type === 'ExpressionStatement';
}

exports.isMul = function(node) {
  return node.type === 'BinaryExpression' && node.operator === '*';
}

exports.isWrappedIdentifier = function(node) {
  return isIdentifier(node) || (isExprStmt(node) && isIdentifier(node.expression));
}

