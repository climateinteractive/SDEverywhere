# SDEverywhere Release Notes

## Version 0.5.3, released on 2020-07-29

- improved performance of LOOKUP
- optimized dimension name references to avoid array accesses
- changed lookup initialization to use static arrays for improved Wasm performance
- replaced wrapper functions with C macros to reduce function call overhead
- split large functions reduce stack frame size (improves Wasm memory use and performance)

## Version 0.5.2, released on 2020-06-03

- includes fixes that more fully automate conversion of complicated MDL model files
- moved tools to Python 3
- use the updated ANTLR-Version package
- improved support for two-dimensional arrays
- added handling of 2D constant arrays with subscripts in any order
- added support for dimension name references
- added support for ELMCOUNT
- added support for PULSE TRAIN
- updated documentation
- updated npm package dependencies

## Version 0.5.1, released on 2019-09-27

- support multiple chartDatfiles delimited by semicolons in app.csv
- override generated app styles in an optional custom.css file in the config folder
- add optional varname prefix to readDat

## Version 0.5.0, released on 2019-07-24

- web app generation uses simpler CSV configuration instead of YAML
- three-dimensional arrays
- :EXCEPT: subscripts
- two-dimensional const arrays
- GET DIRECT DATA for Excel at code generation time
- read output variables from DAT files to WITH LOOKUP variables
- generate variable documention in text and YAML formats
- allow all special characters in variable names
- improved coverage of subrange and mapping edge cases

## Version 0.4.1, released on 2018-03-11

- enable a blank cell in the HTML input panel with an empty value in `sliders`
- add `sde causes` command to print model variable dependencies
- fixed HTML generation on Linux
- corrected instructions for building from the repo

## Version 0.4.0, released on 2018-02-05

- updated web app generation to use an improved template
- added new app.yaml web app specification file
- generate complete web app with the `sde generate --genhtml` command
- removed the Vensim grammar to an independent package
- removed the lotka sample model
- added the SIR sample model
- optimized performance by making high-precision floating point comparisons optional
- added support for generating code to run the model interactively
- removed unnecessary glib2 dependency
- added a warning message when an input or output variable does not exist in the model
- fill in all ref ids for a generated variable that is expanded over a non-apply-to-all array
- implement Vensim data variables in DAT files with lookups
