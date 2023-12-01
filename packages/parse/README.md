# @sdeverywhere/parse

This package contains the parsing layer used by the [SDEverywhere](https://github.com/climateinteractive/SDEverywhere) compiler.
It defines an AST (abstract syntax tree) structure that can be used to express a system dynamics model, and provides an API for parsing a model into an AST structure.
Currently the only implemented input format is Vensim's `mdl` format, but support for the XMILE format is under discussion.

Note: The `parse` API has not yet stabilized, and the package is primarily intended as an implementation detail of the `compile` package, so documentation is not provided at this time.
If you would like to help with the task of stabilizing and formalizing the API for external consumption, please get in touch on the [discussion board](https://github.com/climateinteractive/SDEverywhere/discussions).
