nv.addGraph(function() {
  var format = d3.time.format("%Y-%m-%d");

  var data = {};

  var minDate = null;
  var maxDate = null;

  rawData.forEach(function (item) {
      var d = new Date(item.date);
      var date = format(d);
      if(data[item.repo] == undefined) {
        data[item.repo] = {};
      }
      if (data[item.repo].values == undefined) {
        data[item.repo].values = {};
      }
      if (data[item.repo].values[date] == undefined) {
        data[item.repo].values[date] = 0;
      }
      data[item.repo].values[date]++;

      if (minDate == null || minDate > d) {
        minDate = d;
      }
      if (maxDate == null || maxDate < d) {
        maxDate = d;
      }
    });

  var allDates = d3.time.scale()
                .domain([minDate, maxDate])
                .ticks(d3.time.days, 1);

var keys = Object.keys(data);

  allDates.forEach(function (date) {
    var d = format(date);
    keys.forEach(function (repo) {
      if (Object.keys(data[repo].values).indexOf(d) < 0) {
        data[repo].values[d] = 0;
      }
    });
  });

var finalData = [];
keys.forEach(function(key){
  var x = {key: key};
  var dates = Object.keys(data[key].values);
  var newarr = [];
  dates.forEach(function(date) {
    var varb = new Date(date);
    timestamp = varb.getTime();
    newarr.push([timestamp, data[key].values[date]]);
  });
  x.values = newarr;
  finalData.push(x);
});

ultraFinalData = [];
finalData.forEach(function(dataobj){
  var x = [];
  x = dataobj.values;
  x.sort(function(a,b){
    var d1 = a[0];
    var d2 = b[0];
    return d1 - d2;
  });
  var newval = {};
  newval.key = dataobj.key;
  newval.values = x;
  ultraFinalData.push(newval);
});

// console.log(ultraFinalData);

  var chart;
  nv.addGraph(function() {
      chart = nv.models.stackedAreaChart()
          .useInteractiveGuideline(true)
          .x(function(d) { return d[0] })
          .y(function(d) { return d[1] })
          .controlLabels({stacked: "Stacked"})
          .duration(300);

      chart.xAxis.tickFormat(function(d) { return d3.time.format('%x')(new Date(d)) });
      chart.yAxis.tickFormat(d3.format('d'));

      chart.legend.vers('furious');

      d3.select('#chart')
          .datum(ultraFinalData.slice(0,20)) //not more than 21 fields work here for some reason -_-
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
