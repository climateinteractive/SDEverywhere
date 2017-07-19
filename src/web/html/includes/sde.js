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

//initial variables to show
var init_sliderVars = [inputVars[0], inputVars[1]];
var init_yVarList = [
                      [outputVars[0],outputVars[1]],
                      [outputVars[2],outputVars[3]],
                    ];
    //default to time on x-axis
var init_xVar = ["Time","Time"];

//==============< BEGIN Global State Vars & "Main" Function >=============//

//holds the data printed out by an SDEverywhere WASM
var sdHeaders = null;
var sdData = [];

//holds the current data to be plotted
var chartYVars = init_yVarList;
var chartXVars = init_xVar;
var currSliderVars = init_sliderVars;

var runStartTime;

//the "msin" function
$( function() {
      initUI();

      runStartTime = performance.now();

        //load the JS that was generated with the WASM
      $.getScript( modelScript )
         //model will be run during the leading
         .done(function( script, textStatus ) {

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
  //see whether we have query variables to set the chart inputs and contents
  var url = new URL(document.location.href);
  parseURLArgs(url);

  //create viewButtons
  createViewButtons("viewList",viewButtons);

  //create the config-related widgets
  createDropDownList("#sliderVars","sliderDropdown","sliderDropdown",inputVars,onChangeSliderVarSelection,false, currSliderVars);
  //createDropDownList("#yVars","dataDropdown","dataDropdown",outputVars,onChangeYVarSelection, false, currYVarList );
  //createDropDownList("#xVars","dataDropdownX","dataDropdownX",outputVars,onChangeXDropdown,true, [currXVar]);
  $("#toggleConfig").click(onClick_toggleConfig.bind(this));
  $("#config").hide();

  //create input sliders for the next model run
  createSliders("#sliders","a","B",currSliderVars,null,null);
}


/**
Checks the URL query string for args and sets the chart & sliders accordingly
**/
var parseURLArgs = function(url) {

  var modelInputs = url.searchParams.get("inputs");

  //parse the model inputVars to set the model input params, slider list and values
  if(modelInputs) {

    //non-default arguments were passed in
    Module.arguments = [modelInputs];

    //set the slider list & values to match the arg values
    currSliderVars = [];
    var sliderArgs = modelInputs.split(" ");
    for(var i in sliderArgs) {
        var currArg = sliderArgs[i].split(":");
        var modelInputName = inputVars[currArg[0]];
        var modelInputVal = currArg[1];

        //update slider list
        currSliderVars.push(modelInputName);
        //set the slider value
        inputVarDef[modelInputName][SLIDER_PARAMS_INIT] = modelInputVal;
    } //for (var i
  } // if modelInputs

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

} //end parseURLArgs()


//==============< END init functions >=============//

//==============< Start WASM-related callbacks >=============//

//define callbacks that are used by the auto-generated .js file that calls the WASM
var Module = {
  //don't exit on run-time
  //noExitRuntime : true,

  //gets called after the WASM is finished executing
  postRun: function() {
    //console.log("Finished Model Execution");

    //get the data from the CSV & create an NVD3 chart
    var runEndTime = performance.now()
    var elapsedTime = runEndTime - runStartTime // in ms
    console.warn("Script Load + Model Run: "+Math.round(elapsedTime)+ " ms");

    //create the initial charts
    var chart1 = new SDEChart("chart0",chartYVars[0], chartXVars[0], sdHeaders, sdData);
    var chart2 = new SDEChart("chart1",chartYVars[1], chartXVars[1], sdHeaders, sdData);
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
var reloadPage = function(includeArgs, currSliderVars, chartYVars, chartXVars) {
  var newRunURL = 'index.html';

  if(includeArgs) {
    //encode model input values from sliders
    var modelInputArgs = genModelVarArgString(currSliderVars).trim();
    //encode chart y & x vars into a compact string form
    var yVarArgs = genChartVarsURLArg(chartYVars).trim();
    var xVarArgs = genEncodedOutputVarList(chartXVars,URL_CHART_SEPARATOR).trim();

    //generate the new URL
    newRunURL+='?inputs='+modelInputArgs;
    newRunURL+='&yVars='+yVarArgs;
    newRunURL+='&xVars='+xVarArgs;
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
Generates an encoded list of variables with the specified delimiters
**/
var genEncodedOutputVarList = function(varList, delimiter) {
  var codedVarList = "";
  for(var i in varList) {
      var outputVar = varList[i];
      var varCode = outputName_toId(outputVar);
      if(i > 0)
        codedVarList += delimiter;
      codedVarList += varCode;
  }
  return codedVarList;
}

/**
go through sliders and create a URL query var for the values
**/
var genModelVarArgString = function(currSliderVars) {
  var argString = "";

  //create an encoded model input arg value string
  for(var i in currSliderVars) {
      //get slider value
      var currInputVar = currSliderVars[i];
      var sliderDOMId = "#"+varNameToSliderId(currInputVar);
      var currInputVal = $(sliderDOMId).slider( "option", "value");

      //encode it as [index]:[value] and add to argString
      var argArrayIndex = inputName_toId(currInputVar);
      var argToken = argArrayIndex + ":" + currInputVal + " ";
      argString += argToken;
  }

  return argString;
}

//==============< BEGIN Widget Control Event Handlers >=============//

var onClick_toggleConfig = function() {
  $("#config").slideToggle("slow");
}

/**  changes the available sliders **/
var onChangeSliderVarSelection = function() {
    currSliderVars = $(this).val();
    createSliders("#sliders","sliderList","sliderList",currSliderVars,null,null);
 };


 //==============< BEGIN SDEverywhere Functions to generate Widgets >=============//


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

function varNameToSliderId(sliderVarName) {
  var noSpaces = sliderVarName.replace(/\s/g, '-');
  return "slider-"+noSpaces;
}

/**
create list of sliderss
**/
//https://stackoverflow.com/questions/7895205/creating-dropdown-selectoption-elements-with-javascript
function createSliders(selector, name, id, varList, initValList,onChange) {

    var sliderDiv = $("#sliders");
    sliderDiv.empty();

    //add each column header to the drop-down list
    $.each(varList, function (i, el) {

        var sliderDOMId = varNameToSliderId(el);
        //add the slider HTML
        var currSliderHTML = "<div>"+el+"</div>"; //slider label
        currSliderHTML += "<div id='"+sliderDOMId+"'>";
        currSliderHTML += "<div class='custom-handle ui-slider-handle'></div></div>";
        sliderDiv.append(currSliderHTML);


        //convert the HTML into a slider
        var currSlider = $("#"+sliderDOMId);
        var handle = $( "#"+sliderDOMId+" .custom-handle");
        var currSliderParams = inputVarDef[el];
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
             reloadPage(true, currSliderVars, chartYVars, chartXVars);
           }

         });

    });
}

/**
create a drop-down list
**/
function createViewButtons(divId, buttonConfig) {

    //get button div
    var buttonDiv = $("#"+divId);

    //add each column header to the drop-down list
    $.each(Object.keys(buttonConfig), function (i, el) {
        var viewName = el;
        var viewParams = buttonConfig[viewName];
        buttonDiv.append("<a href='.'>"+ el + "</a><br/>");
    });
}

//==============< BEGIN Helper Functions >=============//


var outputName_toId = function(currOutputVar) {
  return outputVars.indexOf(currOutputVar);
}

var inputName_toId = function(currInputVar) {
  return inputVars.indexOf(currInputVar);
}
