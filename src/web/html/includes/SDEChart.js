

function SDEChart(domId, yVars, xVar, sdHeaders, sdData) {
    this.domId = domId;
    this.currYVarList = yVars;
    this.currXVar = xVar;
    this.sdHeaders = sdHeaders;
    this.sdData = sdData;

    this.chartHeight = 300;

    //create initial charts
    this.refreshCharts();

}
//==============< BEGIN Chart Control Event Handlers >=============//

/** changes x-axis series **/
 SDEChart.prototype.onChangeXDropdown = function() {
    this.currXVar = $(this).val();
    this.refreshCharts();
 };

 /** changes y-axis series **/
 SDEChart.prototype.onChangeYVarSelection = function() {
    this.currYVarList = $(this).val();
    this.refreshCharts();
 };

 //==============< BEGIN SDEverywhere Functions to generate Charts >=============//

/**
Creates nvd3 charts from the args
**/
SDEChart.prototype.createCharts = function(chartData, yVarList, xVar) {

  var self = this;

  /*These lines are all chart setup.  Pick and choose which chart features you want to utilize. */
  nv.addGraph(function() {
    var chart = nv.models.lineChart()
                  .margin({left: 100, right:100})  //Adjust chart margins to give the x-axis some breathing room.
                  .useInteractiveGuideline(true)  //We want nice looking tooltips and a guideline!
                  //.transitionDuration(350)  //how fast do you want the lines to transition?
                  .showLegend(true)       //Show the legend, allowing users to turn on/off line series.
                  .showYAxis(true)        //Show the y-axis
                  .showXAxis(true)        //Show the x-axis
                  .forceY([0,chartData.maxY*1.05])
                  .height(self.chartHeight)
    ;

    chart.xAxis     //Chart x-axis settings
        .axisLabel(xVar)
        .tickFormat(d3.format(',r'));

    chart.yAxis     //Chart y-axis settings
        .axisLabel(JSON.stringify(yVarList))
        .tickFormat(d3.format('.02f'));

    /* Done setting the chart up? Time to render it!*/
    d3.select('#'+self.domId+' svg')    //Select the <svg> element you want to render the chart in.
        .datum(chartData.seriesData)         //Populate the <svg> element with chart data...
        .call(chart)           //Finally, render the chart!
        .style({/* 'width': width,*/ 'height': self.chartHeight })  //set height


    //Update the chart when window resizes.
    nv.utils.windowResize(function() { chart.update() });
    return chart;
  });
} //createCharts



/**
Iterate through CSV and create data for NDV3
**/
SDEChart.prototype.getNDV3Data = function(yVarList, xVar, sdHeaders, sdData) {
  //initialize chart data structures
  //for format: http://nvd3.org/examples/line.html
  var seriesData = new Array(yVarList.length);
  var maxY = 0;

  //populate Chart data
 var xVarColNum = sdHeaders.indexOf(xVar);
 for(var i = 0; i < yVarList.length; i++) {
   var currYVar = yVarList[i];                          //y-var name
   var currYVarColNum = sdHeaders.indexOf(currYVar);    //y-var column #
   var currSeriesData = new Array(sdData.length);       //array that contains current series

   //go through each row of the CSV
   //putting this in the inner loop isn't computationally the most efficient...
   // ... but easier to read
   for (var j = 0; j < sdData.length; j++) {
     //get x&y for current CSV row
      var xVal = sdData[j][xVarColNum];
      var yVal = parseFloat(sdData[j][currYVarColNum]);
      currSeriesData[j] = {x:xVal, y:yVal};

      //save yVal if it's the highest we've seen so far
      if(yVal > maxY) {
        maxY = yVal;
      }

   } //for j

   seriesData[i] = { values:currSeriesData, key:currYVar};
 } //for i

  return { seriesData: seriesData, maxY:maxY };
}

/**
Refreshes the charts to reflect the values of this.currYVarList & currXVar
**/
SDEChart.prototype.refreshCharts = function() {
  //get the data from the CSV & create an NVD3 chart
  var chartData = this.getNDV3Data(this.currYVarList, this.currXVar, this.sdHeaders, this.sdData);
  this.createCharts(chartData,this.currYVarList, this.currXVar);
}
