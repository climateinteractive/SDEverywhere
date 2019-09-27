# SDEverywhere Web App Configuration Reference

Revised: 2019-07-24

SDEverywhere uses CSV files to specify the configuration of web apps that it generates. Five types of application objects are given in separate files. The best way to edit these files is with Excel or OpenOffice. Open the file from the Mac Finder or Windows File Explorer to avoid the Excel text import wizard.

- app.csv
- views.csv
- sliders.csv
- graphs.csv
- colors.csv

## App

The app.csv file contains application global properties.

Column | Type | Description
---|---|---
title | string | application title
version | string | version number
initialView | string | first level view title \> second level view title
trackSliders | boolean | set true to run the model as sliders are moved; set false to wait until the slider is released to run the model
initialTime | number | start time in model runs
startTime | number | start time to show on graphs
endTime | number | final time in model runs
externalDatfiles | string | optional semicolon-delimited list of Vensim DAT filenames giving external data variables
chartDatfiles | string list | optional semicolon-delimited list of Vensim DAT filenames with chart data
logo | string | optional filename of an app logo image
helpUrl | string | optional URL of an online help file

## Views

Views in the views.csv file are selected on the application menu.

Column | Type | Description
---|---|---
title | string | first and second level view titles separated by " > "
leftGraph | string | name of the left graph for this view
rightGraph | string | name of the right graph for this view
helpUrl | string | URL of a help page for this view
description | string | description of this view

## Sliders

The sliders.csv file contains sliders that are included in views by name.
	
Column | Type | Description
---|---|---
viewTitle | string | first and second level view titles separated by " > "
varName | string | Vensim input variable name
label | string | slider label
sliderMin | number | minimum value of the slider range
sliderMax | number | maximum value of the slider range
sliderDefault | number | initial value of the slider variable
sliderStep | number | slider step interval
units | string | units label
format | string | slider number format
description | string | description of this slider

You may leave the value blank when it is the default value as indicated below.	
	
The default value for slider min is 0.	
	
The slider value will be formatted using the string format specifier used by the [numbro](https://numbrojs.com/old-format.html) package. The default is "0a".
	
## Graphs

The graphs.csv file properties of a graph that is included in views by name.

Column | Type | Description
---|---|---
title | string | graph title
xAxisMin | number | x axis minimum value
xAxisMax | number | x axis maximum value
xAxisFormat | string | x axis label number format
yAxisMin | number | y axis minimum value
yAxisMax | number | y axis maximum value
yAxisUnits | string | y axis units label
yAxisFormat | string | y axis label number format
plot1Variable | string | Vensim variable name string to plot
plot1Label | string | graph legend
plot1Style | string | graph style
plot1Color | string | color id for the graph line from colors config
plot1Dataset | string | name of the dataset given in chartDatfiles in app config
description | string | description of this graph

You may leave the value blank when it is the default value as indicated below.	
	
The default value for y axis min is 0.	
	
The default value for y axis max is determined by the data range but can be overridden.	
	
The x and y axis formats are format specifiers used by the [numbro](https://numbrojs.com/old-format.html) package. The default is "0a".
	
Format string rendering example for the value "1000":

format | rendering
---|---
0 | 1000
0a | 1k
'0.0' | 1000.0

In Excel, a number format like '0.0' must be quoted to prevent it from being changed to simply '0'.

The plot variable name is a Vensim variable name that may include a numeric subscript.
	
The plot style value choices are: "line", "thinline", "dotted", and "area". The default is "line".

You may specify up to eight plots in the plot2, plot3, etc. columns.

## Colors

The colors.csv file lists hex color codes for graph lines by id number.

Column | Type | Description
---|---|---
colorId | number | integer color id number starting at 1
colorName | string | name of the color
hexCode | string | hex code of the color starting with "#"
