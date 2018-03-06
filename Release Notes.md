# SDEverywhere Release Notes

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
