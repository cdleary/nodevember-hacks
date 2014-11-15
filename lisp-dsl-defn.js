// Defines the LISPy DSL.
//
// Recognizes limited patterns and built-in functions, constructing the lowered
// code via source rewriting and ``new Function``.
//
// This is a total hack, it's just to prove the point that you can do such
// things. :-) The scoping is also totally screwed up if you try to do
// something sufficiently interesting -- a real DSL of this nature would want
// to limit what constructs were permitted.

var esprima = require('esprima');
var eh = require('./esprima-helpers');

// Built-in functions recognized by the DSL.
var dsl = {
  'string-append': function(str0, str1, str2) {
    return str0 + str1 + str2;
  },
  random: function(n) {
    return Math.floor(Math.random() * n);
  },
  list: function() {
    var result = [];
    for (var i = 0; i < arguments.length; ++i) {
      result.push(arguments[i]);
    }
    return result;
  },
  'list-ref': function(list, index) {
    return list[index];
  },
};

// Rewrites a subtree -- called recursively to evaluate invocation expressions.
function rewriteExpr(ast, params) {
  if (Array.isArray(ast)) throw new Error;
  if (eh.isLiteral(ast)) {
    return eh.getRawLiteral(ast);
  }
  //console.log('rewriting: ', ast);
  if (eh.isIdentifier(ast)) {
    var identifier = eh.getIdentifier(ast);
    if (typeof params !== 'undefined') {
      for (var i = 0; i < params.length; ++i) {
        if (params[i] === identifier) {
          return identifier;
        }
      }
    }
    return '(env["' + identifier + '"])';
  }
  var lhs = eh.getIdentifier(ast.body[0]);
  var rewritten = 'env["' + lhs + '"]('
  for (var i = 1; i < ast.body.length; ++i) {
    rewritten += rewriteExpr(ast.body[i], params);
    if (i !== ast.body.length-1) {
      rewritten += ', ';
    }
  }
  return rewritten + ')';
}

function extractIdentifiers(param_node) {
  var identifiers = [];
  for (var i = 0; i < param_node.body.length; ++i) {
    identifiers.push(eh.getIdentifier(param_node.body[i]));
  }
  return identifiers;
}

// Transforms the esprima parse tree in `ast` and creates/returns a function
// that evaluates against `env`.
function transformAst(env, ast) {
  //console.log(JSON.stringify(ast));
  if (ast.type !== 'Program') throw new Error;
  if (ast.body.length !== 1) throw new Error;
  var fn = ast.body[0];
  var fnbody = fn.body;
  if (fnbody.type !== 'BlockStatement') throw new Error;

  // Checks that the function body starts with "use lisp";
  if (fnbody.body[0].type !== 'ExpressionStatement' ||
      fnbody.body[0].expression.type !== 'Literal' ||
      fnbody.body[0].expression.value !== 'use lisp') {
    throw new Error('can only transform "use lisp" ASTs');
  }

  // Easier than constructing continuations as a quick hack...
  var rewritten = [];

  for (var i = 1; i < fnbody.body.length; ++i) {
    var stmt = fnbody.body[i];
    if (stmt.type !== 'BlockStatement') throw new Error;
    if (eh.isTargetIdentifier(stmt.body[0], 'define')) {
      var define = stmt;
      var binding = eh.getIdentifier(define.body[1].expression);
      if (define.body.length === 4) {  // lambda
        var params = extractIdentifiers(define.body[2]);
        var body = define.body[3];
        var body_code = rewriteExpr(body, params);
        rewritten.push('env["' + binding + '"] = function('
          + params.join(', ') + ') {\n  return ' + body_code + ';\n};');
      } else {  // value binding
        rewritten.push('env["' + binding + '"] = ' + rewriteExpr(define.body[2]) + ';');
      }
    } else {
      rewritten.push(rewriteExpr(stmt) + ';');
    }
  }

  if (rewritten.length !== 0) {
    rewritten[rewritten.length-1] = 'return ' + rewritten[rewritten.length-1];
  }
  var code = rewritten.join('\n');
  return new Function('env', code).bind(undefined, env);
}

module.exports = function(fn) {
  var ast = esprima.parse(fn.toString());
  var env = Object.create(dsl);
  return transformAst(env, ast);
};
