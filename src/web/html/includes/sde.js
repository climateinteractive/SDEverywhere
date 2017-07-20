//==============< BEGIN Model-Specific Params >=============//
// This section is auto-filled in by SDEverywhere

var modelName = ::modelName_::;
var modelScript = ::modelJS_::;

//Entries are varName : [min, max, init]
var inputVarDef = ::inputVarDef_::;

//list of available output variables
var outputVars = ::outputVars_::;

//list of available output variables
var viewButtons = ::viewButtons_::;

//==============< BEGIN General Params and Constants >=============//

//list of the available input variables as an array to preserve ordering
var inputVars = Object.keys(inputVarDef);

//each entry list of the inputVarDef
var SLIDER_PARAMS_MIN = 0
var SLIDER_PARAMS_MAX = 1
var SLIDER_PARAMS_INIT = 2
//delimiters for the URL query string
var URL_CHARTVAR_SEPARATOR = ",";
var URL_CHART_SEPARATOR = ";";

//==============< BEGIN Global State Vars & "Main" Function >=============//

//holds the data printed out by an SDEverywhere WASM
var sdHeaders = null;
var sdData = [];

//holds the charts and current data to be plotted
var sdeCharts = [];
var chartYVars = [[outputVars[1]]];
var chartXVars = ["Time"];
var currSliderList = [[inputVars[0]]];

//holds viewInfo
var currView = null;

var runStartTime;

//the "msin" function
$( function() {

      //parse the model inputVars to set the model input params, slider list and values
      var url = new URL(document.location.href);
      var modelInputs = url.searchParams.get("inputs");
      if(modelInputs) {
        //non-default arguments were passed in
        Module.arguments = [modelInputs];
      }

      runStartTime = performance.now();

        //load the JS that was generated with the WASM
      $.getScript( modelScript )
         //model will be run during the leading
         .done(function( script, textStatus ) {
             initUI();

             //set the page title
             $("#title").text("SDEverywhere: "+modelName);

             //sets the event handler for the next run
             $("#reset").click(reset.bind(this));
      })

      .fail(function( jqxhr, settings, exception ) {
         console.log("Failed... "+exception);
      });
});


//==============< BEGIN init functions >=============//

/**
Creates widgets for the UI as well as parses query string args
**/
var initUI = function() {

  //create viewButtons
  createViewButtons("viewList",viewButtons);

  //see whether we have query variables to set the chart inputs and contents
  var url = new URL(document.location.href);
  parseURLArgs(url);

  //create the config-related widgets
  createDropDownList("#sliderVars","sliderDropdown","sliderDropdown",inputVars,onChangeSliderVarSelection,false, currSliderList);
  $("#toggleSliders").click(onClick_toggleSliders.bind(this));
  $("#sliderList").hide();

  //create input sliders for the next model run
  createSliders("#sliders","a","B",currSliderList,null,null);

  //add toggle event handler to the chart series toggle buttons -- do this only once
  $("#charts button").click(onClick_toggleChartSeries);

}


/**
Checks the URL query string for args and sets the chart & sliders accordingly
**/
var parseURLArgs = function(url) {

  //parse the model inputVars to set the model input params, slider list and values
  var modelInputs = url.searchParams.get("inputs");
  if(modelInputs) {

    var modelInputs = modelInputs.split(" ");
    for(var i in modelInputs) {
        var currArg = modelInputs[i].split(":");
        var modelInputName = inputVars[currArg[0]];
        var modelInputVal = currArg[1];
        //set the slider value
        inputVarDef[modelInputName][SLIDER_PARAMS_INIT] = modelInputVal;
    } //for (var i
  } // if modelInputs

  //see if there is a slider list -- if so, then show only those sliders
  var sliders = url.searchParams.get("sliders");
  //set the slider list & values to match the arg values
  if(sliders) {
    sliders = sliders.split(",");

    currSliderList = [];
    for(var i in sliders) {
      var sliderVarName = inputVars[sliders[i]];
      currSliderList.push(sliderVarName);
    }
  }

  //parse the yVar list to put the correct outputVars on the chart
  var yVars = url.searchParams.get("yVars");
  if(yVars) {
    //clear default values for the ones passed via URL
    chartYVars = [];

    //get yVar codes for each chart
    var yVarCodesForCharts = yVars.split(";")
    for(var i in yVarCodesForCharts) {
      var yVarList = [];

      //parse and decode yVar codes for current chart
      var yVarCodes = yVarCodesForCharts[i].split(",");
      for(var j in yVarCodes) {
        var currCode = yVarCodes[j];
        yVarList.push(outputVars[currCode]);
      }

      //add the decoded yVars to the global chartYVars variablezd
      chartYVars.push(yVarList);
    }
  } //if(yVars) {

  //if an xVar is set, then set it on the chart
  var xVarCodesForCharts = url.searchParams.get("xVars");
  if(xVarCodesForCharts) {
    //clear default values for the ones passed via URL
    chartXVars = [];

    //parse and decode yVar codes for current chart
    var xVarCodes = xVarCodesForCharts.split(";");
    for(var i in xVarCodes) {
      var currCode = xVarCodes[i];
      chartXVars.push(outputVars[currCode]);
    }
  } //if(xVarCodesForCharts) {

  //if neither x nor y args were set, then check for view number and use that if it exists
  //  if not, then default to first view
  if(!(yVars && xVarCodesForCharts) && viewButtons != null) {
    //check to see whether we have view data
    var viewsList = Object.keys(viewButtons);
    if(viewsList.length > 0) {

      //check to see if view was specified in the URL
      //if not, default to first view
      var viewName = url.searchParams.get("view")
      if(viewName == null)
        viewName = viewsList[0]

      //update the list of yVars, xVars, and sliders
      //but don't make the charts yet since we haven't run the model yet
      updateView(viewName, false);
    }
  }
} //end parseURLArgs()


/**
updates the view -- i.e. charts & sliders shown
**/
 function updateView(viewName, refreshCharts) {
   //check to see if view exists
   if(!(viewName in viewButtons)) {
     console.log("View not found: "+ viewName);
     return;
   }

   //save the current view name
   currView = viewName;

   //get parameters for view
   var viewParams = viewButtons[currView];

   //save the x & y vars that should appear on the chart(s)
   chartXVars = viewParams.xVars.slice();
   chartYVars = viewParams.yVars.slice();
   if(refreshCharts)
    createCharts(viewName);

   //update the list of visible sliders
   currSliderList = viewParams.sliders.slice();
   createSliders("#sliders","sliderList","sliderList",currSliderList,null,null);

   //highlight the selected view button so user can identify the current view
   var buttonDomId = varNameToViewButtonId(viewName);
   $(".viewButton_highlight").removeClass("viewButton_highlight");
   $("#"+buttonDomId).addClass("viewButton_highlight");
 }

//==============< END init functions >=============//

//==============< Start WASM-related callbacks >=============//

//define callbacks that are used by the auto-generated .js file that calls the WASM
var Module = {
  //gets called right after the WASM is finished executing
  postRun: function() {
    //get the data from the CSV & create an NVD3 chart
    var runEndTime = performance.now()
    var elapsedTime = runEndTime - runStartTime // in ms
    console.warn("Script Load + Model Run: "+Math.round(elapsedTime)+ " ms");

    //create charts only after we run the model
    createCharts();
  },

  //gets called when the .wasm prints to stdout
  print: (function() {
    return function(text) {

      //parse row data printed by the WASM and add to matrix
      var rowData = text.split("\t");

      //save headers and rows separately for later use
      if(sdHeaders == null)
        sdHeaders = rowData;
      else
        sdData.push(rowData);
    };
  })(),

  //allows WASM to send status msgs
  setStatus: function(text) {
     if(text.length == 0)
      text = "done";

     console.log("status:"+text);
  },

/* uncomment for debugging
  printErr: function(text) {
    if (arguments.length > 1) text = Array.prototype.slice.call(arguments).join(' ');
      console.error(text);
  },
*/

};  //end  var Module


//==============< END WASM-related callbacks >=============//


//==============< BEGIN Run-related Event Handler + helpers  >=============//

/**
Creates URL to reload the page and pass the right input variabls to it
**/
var reloadPage = function(includeURLArgs, currSliderList, chartYVars, chartXVars) {
  var newRunURL = 'index.html';

  if(includeURLArgs) {

    //encode all model input values from sliders
    var modelInputArgs = genModelVarArgString(currSliderList).trim();
    newRunURL+='?inputs='+modelInputArgs;

    //see if we are looking at an unchanged view
    //(i.e. yVars, xVars, and sliders are still as defined)
    if(currView != null) {
      //if so, then we don't have to pass-on a list of y,x, and sliders
      newRunURL+='&view='+currView;
    } else {
      //if we have modified the current view, then
      //encode chart y & x vars into a compact string form
      var yVarArgs = genChartVarsURLArg(chartYVars).trim();
      var xVarArgs = genEncodedOutputVarList(chartXVars,URL_CHART_SEPARATOR).trim();
      var sliderArgs = genEncodedInputVarList(currSliderList,URL_CHARTVAR_SEPARATOR).trim();
      newRunURL+='&yVars='+yVarArgs;
      newRunURL+='&xVars='+xVarArgs;
      newRunURL+='&sliders='+sliderArgs;
    }
  }

  document.location.href=newRunURL;
} //if(includeArgs) {

/**
Set the URL query string to reflect the current State and then reload page
This will run the model w/ the new slider inputs
**/
var reset = function() {
  reloadPage(false);
}

/**
Generates an encoded list of lists of chart variables
This function is most relevant to chartYVars b/c charts can have multiple y series
**/
var genChartVarsURLArg = function(allChartsOutputVars) {
  var urlArg = "";
  for(var i in allChartsOutputVars) {
    if(i > 0)
      urlArg += URL_CHART_SEPARATOR;
    urlArg += genEncodedOutputVarList(allChartsOutputVars[i],URL_CHARTVAR_SEPARATOR);
  } //for i
  return urlArg;
}

/**
go through all inputVars and create a URL query var for the current values
**/
var genModelVarArgString = function(currSliderList) {
  var argString = "";

  //create an encoded model input arg value string
  for(var i in inputVars) {
      //get slider value
      var currInputVar = inputVars[i];
      var sliderDOMId = "#"+varNameToSliderId(currInputVar);
      var currInputVal = $(sliderDOMId+" .slider").slider( "option", "value");

      //encode it as [index]:[value] and add to argString
      var argArrayIndex = inputVarName_toCode(currInputVar);
      var argToken = argArrayIndex + ":" + currInputVal + " ";
      argString += argToken;
  }

  return argString;
}

//==============< BEGIN Widget Control Event Handlers >=============//

/**
Toggles whether the slider menu is visible
***/
var onClick_toggleSliders = function() {
  $("#sliderList").slideToggle("slow");
}

/**  changes the available sliders on a given view **/
var onChangeSliderVarSelection = function() {
    currSliderList = $(this).val();

    //since we changed the slider value in the view, we're technically not looking at it anymore
    currView = null;

    //update the mulitselect by replacing it
    //TODO: don't replace HTML, just update selection...
    createSliders("#sliders","sliderList","sliderList",currSliderList,null,null);
 };

/**
toggles whether the series selector is visible for a given chart
**/
 var onClick_toggleChartSeries = function() {
   //has form [chartDivId]_toggle
   var toggleId = $(this).attr("id").split("_");
   var chartId = toggleId[0];

   $("#"+chartId+" div").slideToggle("slow");
 }

  /**
  Update the data series shown on a chart
  **/
  var onChangeChartSeries = function() {
    //clear out currViewPointer as we are altering the configured view
    currView = null;

    //dropdown Id's have form [chartSeries]_[chartNum]
    var dropdown = $(this).attr("id").split("_");
    var series = dropdown[0];
    var i = dropdown[1];

    //update the correct global variable
    if(series == "y")//this.currXVar = $(this).val();
      chartYVars[i] = $(this).val();
    else {
      chartXVars[i] = $(this).val();
    }

    //regenerate new charts with the series data
    //TODO: don't regenerate whole SVG
    sdeCharts[i].refreshCharts(chartYVars[i], chartXVars[i]);

  };

 //==============< BEGIN SDEverywhere Functions to generate Widgets >=============//

 /**
 create charts that reflect the current x & y display vars
 **/
 function createCharts(viewName) {
   //check to see whether each chart has y & x variables
   if(chartYVars.length != chartXVars.length) {
     alert("Error: "+viewName+": xVars and yVars indicate a differing # of charts");
   }

   //clear existing charts, series selectors, and hiddle toggles
   d3.selectAll("svg > *").remove();
   $("#charts button").hide();
   $("#charts div div > *").remove();

   //create new charts
   sdeCharts = new Array(chartYVars.length);
   for(var i in chartYVars) {
     var divId = "chart"+i;
     //create the chart object
     sdeCharts[i] = new SDEChart(divId,chartYVars[i], chartXVars[i], sdHeaders, sdData);

     //create series dropdowns and hide them
     var dropdownSelector = "#"+divId+" div";
     createDropDownList(dropdownSelector,"y_"+i,"y_"+i,outputVars,onChangeChartSeries, false, chartYVars[i] );
     createDropDownList(dropdownSelector,"x_"+i,"x_"+i,outputVars,onChangeChartSeries,true, [chartXVars[i]]);
     $(dropdownSelector).hide();

     //create dropdown toggles for each chart and show button
     var toggleSelector = "#"+divId+" button"
     $(toggleSelector).show();
   }
 }


/**
create a drop-down list
**/
//https://stackoverflow.com/questions/7895205/creating-dropdown-selectoption-elements-with-javascript
function createDropDownList(selector, name, id, optionList, onChange, isSingle, initVals) {
    //set attributes differently depending on single vs multi-select
    var size = isSingle ? " " : "size=10 ";
    var multiple = isSingle ? "" : "multiple";

    //create combo object
    var combo = $("<select "+size+multiple+"></select>").attr("id", id).attr("name", name);

    //add each column header to the drop-down list
    $.each(optionList, function (i, el) {
        //select them if the data is initially included on the charts
        var selected = "";
        if(initVals != null)
          if(initVals.indexOf(el) >= 0)
            selected = " selected";

        combo.append("<option"+selected+">" + el + "</option>");
    });

    //add change eventHandler
    if(onChange)
      combo.change(onChange);

    //add drop-down to page
   $(selector).append(combo);
}

/**
create list of sliderss
**/
//https://stackoverflow.com/questions/7895205/creating-dropdown-selectoption-elements-with-javascript
function createSliders(selector, name, id, visibleSliderVarList, initValList,onChange) {

    var sliderDiv = $("#sliders");
    sliderDiv.empty();

    //add each column header to the drop-down list
    $.each(inputVars, function (i, inputVarName) {

        var sliderDOMId = varNameToSliderId(inputVarName);

        //add the slider HTML
        var currSliderHTML = `<div id="${sliderDOMId}"><div>${inputVarName}</div>`; //slider label
        currSliderHTML += "<div class='slider'>";
        currSliderHTML += "<div class='custom-handle ui-slider-handle'></div></div></div>";
        sliderDiv.append(currSliderHTML);

        //convert the HTML into a slider
        var currSlider = $("#"+sliderDOMId+ " .slider");
        var handle = $( "#"+sliderDOMId+" .slider .custom-handle");
        var currSliderParams = inputVarDef[inputVarName];
        currSlider.slider({
           min: currSliderParams[SLIDER_PARAMS_MIN],
           max: currSliderParams[SLIDER_PARAMS_MAX],
           step: (currSliderParams[SLIDER_PARAMS_MAX] > 1) ? 1 : 0.01,
           value: currSliderParams[SLIDER_PARAMS_INIT],
           create: function() {
             handle.text( $( this ).slider( "value" ) );
           },
           slide: function( event, ui ) {
             handle.text( ui.value );
           },
          //onChange, refresh the page with the slider vals
           change: function(event, ui) {
             console.log(ui.value)
             reloadPage(true, currSliderList, chartYVars, chartXVars);
           }
         });

         //hide the slider if we don't need it in the view
         var currSlider = $("#"+sliderDOMId);
         if(visibleSliderVarList.indexOf(inputVarName) < 0)
          currSlider.hide();
    });
}



/**
create a list of all view buttons
**/
function createViewButtons(divId, buttonConfig) {

    //get button div
    var buttonDiv = $("#"+divId);

    //add each button to the view list
    $.each(Object.keys(buttonConfig), function (i, viewName) {
        var viewParams = buttonConfig[viewName];
        var buttonDomId = varNameToViewButtonId(viewName);
        buttonDiv.append(`<input class='viewButton' id='${buttonDomId}' type='submit' value='${viewName}'/><br/>`);
    });

    //add click listener to each button
    $(`#${divId} input`).click(function() {
        var viewName = ($(this).attr("value"));
        updateView(viewName, true);
    });
}


//==============< BEGIN Helper Functions >=============//

var domifyStr = function(strVar) {
  return strVar.toLowerCase().replace(new RegExp(' ', 'g'), '_')

}

/**
Generates an encoded list of variables with the specified delimiters
**/
var genEncodedVarList = function(encoderFunc, varList, delimiter) {
  var codedVarList = "";
  for(var i in varList) {
      var outputVar = varList[i];
      var varCode = encoderFunc(outputVar);
      if(i > 0)
        codedVarList += delimiter;
      codedVarList += varCode;
  }
  return codedVarList;
}

//creates a list of coded outputVars
var genEncodedOutputVarList = function(outputVarList, delimiter) {
   return genEncodedVarList(outputName_toCode,outputVarList, delimiter);
}

//creates a list of coded inputVars
var genEncodedInputVarList = function(inputVarList, delimiter) {
  return genEncodedVarList(inputVarName_toCode,inputVarList, delimiter);
}

//gets code for a given inputVar
var inputVarName_toCode = function(currInputVar) {
  return inputVars.indexOf(currInputVar);
}

//gets code for a given outputVar
var outputName_toCode = function(currOutputVar) {
  return outputVars.indexOf(currOutputVar);
}

/** generates domId for specified slider **/
function varNameToSliderId(sliderVarName) {
  return "slider_"+domifyStr(sliderVarName);
}

/** generates domId for specified view button **/
function varNameToViewButtonId(viewName) {
  return "view_"+domifyStr(viewName);
}
