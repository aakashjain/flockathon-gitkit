nv.addGraph(function() {
  var data = [
    {
      key: "Total",
      values: []
    }, {
      key: "Unique",
      values: []
    }
  ];

  rawData.forEach(function (item) {
    data[0].values.push({x: item.timestamp, y: item.count});
    data[1].values.push({x: item.timestamp, y: item.uniques});
  });

  console.log(data);

  var chart;
  nv.addGraph(function() {
    chart = nv.models.multiBarChart()
      .reduceXTicks(false)
      .rotateLabels(90)
      .groupSpacing(0.1)
      .duration(350);

    chart.xAxis.tickFormat(function(d) { return d3.time.format('%x')(new Date(d)) });
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
