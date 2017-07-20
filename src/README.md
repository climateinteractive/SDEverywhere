# SDEverywhere 0.3.2

Please refer to the `README.md` file on the [GitHub repo](https://github.com/ToddFincannon/SDEverywhere) for full documentation.

## Introduction

[SDEverywhere](http://sdeverywhere.org/) is a [Vensim](http://vensim.com/) [transpiler](https://en.wikipedia.org/wiki/Source-to-source_compiler) that handles a broad range of [System Dynamics](http://www.systemdynamics.org/what-is-s/) models. It supports some advanced features of [Vensim Modeling Language](https://www.vensim.com/documentation/index.html?ref_language.htm), including subscripts, subranges, and subscript mapping. It generates C and JavaScript code, and can create a generic web user interface for simple models.

Using SDEverywhere, you can deploy interactive System Dynamics models in mobile, desktop, and web apps for policymakers and the public. Or you could perform model analysis using general-purpose languages, running the model as high-performance C code.

## Caveats

SDEverywhere has been used to generate code for complex models with thousands of equations, but your model may use features of Vensim that SDEverywhere cannot translate yet. Please fork our code and contribute! Here are some prominent current limitations.

- Sketch information, the visual representation of the model, is not converted.
- Only the most common [Vensim functions](https://www.vensim.com/documentation/index.html?20770.htm) are implemented.
- Arrays must be one- or two-dimensional.
- All models run using the Euler integrator.
- You must remove tabbed arrays and add them to the model as separate, non-apply-to-all variables.
- You must remove macros and either hand code them in C or rewrite equations that use them.

Tabbed arrays and macros are removed from the model during preprocessing and written to the `removals.txt` file for your reference.
