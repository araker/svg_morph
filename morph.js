
function getNewMorphInstance()
{
    var instance = {};
    instance.forward = true;
    instance.times = 0;
    instance.debug = true;
    instance.distanceBetweenSamples = 0;

    /*
        pointsInArray is a array of points in the form {x:int,y:int}
        invertedY should be true when (0,0) is top left corner
    */
    instance.checkWindingArray = function(pointsArray, invertedY)
    {
        if (pointsArray.length <= 1) return null;

        var sum = 0;
        for (var i = 0; i < pointsArray.length; i++)
        {
            if ( i < pointsArray.length - 1)
            {
                sum += (pointsArray[i+1].x - pointsArray[i].x) * (pointsArray[i+1].y + pointsArray[i].y);
            }
            else
            {
                sum += (pointsArray[0].x - pointsArray[i].x) * (pointsArray[0].y + pointsArray[i].y);
            }
        }

        return (invertedY) ? (sum <= 0) : (sum >= 0);

    },
    instance.reverseWindingArray = function(pointsArray)
    {
        pointsArray.reverse();
    },

    /*

        distanceBetweenSamples, the lower the number the higher the precision (number of points sampled)
        path0Data, d value of from path
        path1Data, d value of to path
        pathElement the actual path element in the dom wrapped in d3.select
        startData, value map {}, which consists of
                points:[{x,y}], these points are control points which are mapped between shapes
                the points need to be layed out in order, starting from the first control point in a CW or CCW direction to the other points.
    */

    instance.initialize = function(distanceBetweenSamples, path0Data, path1Data, pathElement, startData0, startData1)
    {
        instance.pathElement = pathElement;

        instance.path0Data = path0Data;
        instance.path1Data = path1Data;

        instance.distanceBetweenSamples;

        var path0 = document.createElementNS("http://www.w3.org/2000/svg", 'path');
        path0.setAttribute("d", instance.path0Data);

        path1 = path0.cloneNode();

        var n0 = path0.getTotalLength();
        var n1 = (path1.setAttribute("d", path1Data), path1).getTotalLength();

        var distances0, distances1;

        distances0 = [0], i = 0, dt = distanceBetweenSamples / Math.max(n0, n1);
        while ((i += dt) < 1) distances0.push(i);
        distances0.push(1);

        //map distance on path to point
        instance.points0 = distances0.map(function(t) {
          var p = path0.getPointAtLength(t * n0);
          //p.x = Math.round(p.x*100)/100;
          //p.y = Math.round(p.y*100)/100;
          return p;
        });

        instance.points1 = distances0.map(function(t) {
          var p = path1.getPointAtLength(t * n1);
          //p.x = Math.round(p.x*100)/100;
          //p.y = Math.round(p.y*100)/100;
          return p;
        });

        distances1 = distances0;

        //check windings
        var winding0 = instance.checkWindingArray(instance.points0, true);
        var winding1 = instance.checkWindingArray(instance.points1, true);

        if (!winding0) //false = CCW
        {
            instance.reverseWindingArray(instance.points0);
        }

        if (!winding1)
        {
            instance.reverseWindingArray(instance.points1);
        }

        if (startData0.points.length != startData1.points.length )
        {
            console.log('pathAnimation: controlPoints should have the same number of elements')
        }

        var indexes0 = instance.findNearestPointInArray(instance.points0, startData0.points);
        var indexes1 = instance.findNearestPointInArray(instance.points1, startData1.points);

        instance.points0 = instance.reorderArray(indexes0[0],instance.points0);
        instance.points1 = instance.reorderArray(indexes1[0],instance.points1);

        //since the points of the path can be reorderd, get pointAtLength would give incorrect result, startPointAddition is the offset for getting correct values out of pointAtLength
        var startPointAddition = [distances0[indexes0[0]], distances1[indexes1[0]]];

        var newIndexes0 = instance.moveArrayIndexes(instance.points0, indexes0);
        var newIndexes1 = instance.moveArrayIndexes(instance.points1, indexes1);

        instance.mapArrayFromPointToPoint([newIndexes0, newIndexes1], [instance.points0, instance.points1],[path0, path1], [distances0, distances1], [n0,n1], startPointAddition, (n0 > n1) ? 0 : 1);

        instance.points = [];

        //make interpolations between points
        for (var i = 0; i < instance.points0.length; i++)
        {
            instance.points.push(d3.interpolate([instance.points0[i].x,instance.points0[i].y],[instance.points1[i].x,instance.points1[i].y]));
        }
    };
    instance.reorderArray = function(fromIndex, array)
    {
        //fromIndex will become first index in new array, left shift array
        var newArray = [];
        for (var i = fromIndex; i < array.length; i++)
        {
          newArray.push(array[i]);
        }
        for (var i = 0; i < fromIndex; i++)
        {
          newArray.push(array[i]);
        }
        return newArray;
    }
    instance.findNearestPointInArray = function(sampledPoints,controlPoints)
    {
        var indexes = [];

        var minDistance = Number.MAX_SAFE_INTEGER;

        for (var j = 0; j < controlPoints.length; j++)
        {
            var curPoint = controlPoints[j];
            var curIndex = -1;
            minDistance = Number.MAX_SAFE_INTEGER;

            for (var i = 0; i < sampledPoints.length; i++)
            {
                var sqrDist = instance.distancePointsSquared(curPoint, sampledPoints[i]);
                if (sqrDist < minDistance)
                {
                    curIndex = i;
                    minDistance = sqrDist;
                }

                lastValue = sqrDist;
            }

            //insert controlPoints here for better shape edges
            sampledPoints[curIndex].x = controlPoints[j].x;
            sampledPoints[curIndex].y = controlPoints[j].y;

            indexes.push(curIndex);
        }
        return indexes;
    };
    //mapping longest path on shortest path
    instance.mapArrayFromPointToPoint = function (indexes, points, paths, distances, totalLenghts, startPointAddition, longerPathIndex)
    {
        var addIndexes = [ [] , [] ];
        var dif = [];

        var curIndex = 0;   //keep track of index in newly constructed points array

        //add first point as last point for creating a closed curve
        points[0].push(points[0][0]);
        points[1].push(points[1][0]);
        indexes[0].push(points[0].length - 1);
        indexes[1].push(points[1].length - 1);
        distances[0].push(1);
        distances[1].push(1);

        for (var i = 0; i < indexes[0].length -1; i++)
        {
            var start = [], end = [];

            for (var j = 0; j < 2; j++)
            {
                if (indexes[j][i] < indexes[j][i+1])
                {
                    start[j] = indexes[j][i]
                    end[j] =  indexes[j][i+1];
                }
                else
                {
                    start[j] = indexes[j][i+1]
                    end[j] =  indexes[j][i];
                }
            }

            //how may points between cp 0 and 1
            dif[0] = end[0] - start[0];
            dif[1] = end[1] - start[1];

            if (instance.debug) console.log('dif0 ' + dif[0] + ' dif1 ' + dif[1]);

            //when number differs remove points in between control points of the shortest path and create new points according to points in between the control points of the longer path
            if (dif[0] != dif[1])
            {

                var smaller = (longerPathIndex == 0) ? 1 : 0; //(dif[0] < dif[1]) ? 0 : 1;
                var bigger = longerPathIndex; //(dif[0] > dif[1]) ? 0 : 1;

                var curDif = dif[bigger] -1; //don't include two control points

                if (instance.debug) console.log('adding ' + (dif[bigger] - 1));

                //WARNING this only works for CW paths, for CCW startPointAddition needs to be substracted
                var startLength = distances[smaller][indexes[smaller][i]] + startPointAddition[smaller];
                var endLength = distances[smaller][indexes[smaller][i+1]] + startPointAddition[smaller];

                var pathLengthPortion = ( endLength - startLength) / curDif;

                //remove current points
                instance.removeElements(points[smaller], curIndex + 1, Math.max(0,dif[smaller] - 1));

                if (instance.debug) console.log('remove  index' + (curIndex + 1) + ' amount ' + (dif[smaller] - 1));

                //add elements
                var tempArray = [];
                var startIndex = curIndex + 1;
                for (var j = 1; j <= curDif; j++)
                {

                    var point = paths[smaller].getPointAtLength( instance.normalizePathDistance(startLength + j * pathLengthPortion) * totalLenghts[smaller]);
                    tempArray.push(point);
                    curIndex += 1;
                }

                instance.insertItemAtIndex(tempArray,startIndex,points[smaller])

                curIndex += 1; //for 2nd control point
            }
            else
            {
                curIndex += dif[0];
            }
        }
    };
    //used for converting new path distance (starting at control point 0) to old path distance
    instance.normalizePathDistance= function(number)
    {
        if (number > 1) return number -1;
        else return number;
    }
    instance.removeElements = function(array,startIndex, howMany)
    {
        array.splice(startIndex, howMany);
    };
    instance.distancePointsSquared = function(point1, point2)
    {
        return Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2);
    };
    instance.moveArrayIndexes = function (array, indexes)
    {
        //move every index to the left so that the value of indexes 0 is first element of array
        var movehowMany = indexes[0];
        var newIndexes = [];
        for (var i = 0; i < indexes.length; i++)
        {
            if (indexes[i] - movehowMany >= 0)
            {
                newIndexes.push(indexes[i] - movehowMany);
            }
            else
            {
                var itemsLeft = movehowMany;
                itemsLeft -= indexes[i];
                newIndexes.push(array.length - itemsLeft);
            }
        }
        return newIndexes;
    };
    //how many > 0 move to right, else to left
    instance.moveArrayElements = function(array, howMany)
    {
        if (howMany == 0) return;

        var length = array.length;
        var tempAr = [];
        if (howMany > length)
        {
            howMany %= length;
        }

        var firstIndex = (howMany > 0) ? length - howMany : howMany * -1;

        var tempAr = [];

        for (var i = firstIndex; i < length; i++)
        {
            tempAr.push(array[i]);
        }

        for (var i = 0; i < firstIndex; i++)
        {
            tempAr.push(array[i]);
        }

        return tempAr;
    }
    instance.insertItemAtIndex = function(item, index, array)
    {
        //current element at index will be next element
        if (Array.isArray(item))
        {
            Array.prototype.splice.apply(array, [index, 0].concat(item));
        }
        else
        {
            array.splice(index, 0, item);
        }
    };
    instance.startAnimation = function(duration, delay, easeFunction, functionToCall)
    {
        instance.functionToCall = (functionToCall !== undefined) ? functionToCall : null;

        instance.pathElement.transition().duration(duration).delay(delay).ease(easeFunction).attrTween("d", instance.tweenFunction()).each("end", function(d,i)
        {
            if (instance.functionToCall)
            {
                instance.functionToCall();
            }

        });
    };
    instance.reverse = function ()
    {
        instance.forward = !instance.forward;

        instance.points = [];

        var from = (instance.forward) ? instance.points0 : instance.points1;
        var to = (instance.forward) ? instance.points1 : instance.points0;
        for (var i = 0; i < instance.points0.length; i++)
        {
            instance.points.push(d3.interpolate([from[i].x,from[i].y],[to[i].x,to[i].y]));
        }
    };
    instance.tweenFunction = function ()
    {
        return function()
        {
            return function(t) {
                return t < 1 ? "M" + instance.points.map(function(p) { return p(t); }).join("L") : (instance.forward) ? instance.path1Data : instance.path0Data;
            };
        }
    };
    instance.circleToPath = function(r)
    {
        var output = "M" + (-r).toString() + ",0"; //+ (r).toString();
        output += "a" + r.toString() + "," + r.toString() + " 0 1,0 " + (2 * r).toString() + ",0";
        output += "a" + r.toString() + "," + r.toString() + " 0 1,0 " + (-2 * r).toString() + ",0";
        output+= ' z';

        return output;
    };
    //element is d3 selection of element
    instance.displayPointArray = function(pointArray, element, showNumber)
    {
        for (var i = 0; i < pointArray.length; i++)
        {
            element.append('circle').attr({cx:pointArray[i].x,cy: pointArray[i].y, r: 1}).classed('testPoint',true);
            if (showNumber)
            {
                element.append('text').attr({x:pointArray[i].x + 6, y: pointArray[i].y + 6})
                .text(i)
                .attr("font-family", "sans-serif")
                .attr("font-size", "12px")
                .attr("fill", "green");
            }
        }
    }
    instance.getSegmentCoordinates = function(element)
    {
        var pathSegList = element.node().pathSegList;

        var dataset = [];

        // loop through segments, adding each endpoint to the restored dataset
        for (var i = 0; i < pathSegList._list.length; i++) {
            var item = pathSegList.getItem(i);
            if (item.x !== undefined)
            {
                dataset.push({
                    x: instance.round(item.x),
                    y: instance.round(item.y)
                })
            }
            else
            {
                if (instance.debug) console.log('encountered ' + item.pathSegTypeAsLetter + ' without position');
            }
        }

        return dataset;
    }

    instance.round = function(aNumber)
    {
        return Math.round((aNumber + 0.0001) * 100 ) / 100;
    }

    return instance;
}
