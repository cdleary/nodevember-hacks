var lispSuperPowers = require('./lisp-dsl-defn');

function greet() {
  "use lisp"
  {define
    salutation
    {list-ref
      {list
        "Hi"
        "Hello"}
      {random
        2}}}
  {define
    greet
      {name}
      {string-append
        salutation
        ", "
        name}}
  {greet
    "Chris"}
}

exports.greet = lispSuperPowers(greet)
