nv.addGraph(function() {
  var chart = nv.models.pieChart()
      .x(function(d) { if (d.user == undefined) return "Anonymous"; else return d.user; })
      .y(function(d) { return d.commits })
      .showLabels(true)     //Display pie labels
      .labelThreshold(.05)  //Configure the minimum slice size for labels to show up
      .labelType("percent") //Configure what type of data to show in the label. Can be "key", "value" or "percent"
      .donut(true)          //Turn on Donut mode. Makes pie chart look tasty!
      .donutRatio(0.25)     //Configure how big you want the donut hole size to be.
      ;

    d3.select("#chart")
        .datum(rawData)
        .transition().duration(350)
        .call(chart);

  return chart;
});
