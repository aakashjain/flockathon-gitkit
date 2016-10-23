nv.addGraph(function() {
  var data = [
    {
      key: "Sunday",
      values: []
    }, {
      key: "Monday",
      values: []
    }, {
      key: "Tuesday",
      values: []
    }, {
      key: "Wednesday",
      values: []
    }, {
      key: "Thursday",
      values: []
    }, {
      key: "Friday",
      values: []
    }, {
      key: "Saturday",
      values: []
    }
  ];

  rawData.forEach(function (item) {
    data[item[0]].values.push({x: item[1], y: item[2]});
  });

  console.log(data);

  var chart;
  nv.addGraph(function() {
    chart = nv.models.stackedAreaChart()
      .useInteractiveGuideline(true)
      .controlLabels({stacked: "Stacked"})
      .duration(350);

    chart.xAxis.tickFormat(function(d) { return d });
    chart.yAxis.tickFormat(d3.format('d'));

    chart.legend.vers('furious');

    d3.select('#chart')
        .datum(data) //not more than 21 fields work here for some reason -_-
        .transition().duration(1000)
        .call(chart)
        .each('start', function() {
            setTimeout(function() {
                d3.selectAll('#chart *').each(function() {
                    if(this.__transition__)
                        this.__transition__.duration = 1;
                })
            }, 0)
        });

    nv.utils.windowResize(chart.update);
    return chart;
  });
});
