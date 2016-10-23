nv.addGraph(function() {
  var data = [{
    key: "Commits",
    values: []
  }];
  rawData.forEach(function (item) {
    data[0].values.push({x: item.week * 1000, y: item.total});
  });

  console.log(data);

  var chart;
  nv.addGraph(function() {
    chart = nv.models.discreteBarChart()
      .staggerLabels(true)
      .rotateLabels(90)
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
