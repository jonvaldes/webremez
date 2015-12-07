"use strict";
// Remez evaluation code taken from:
// https://github.com/olessavluk/yotodo

function EvaluateInScope(codeText){
    var abs = Math.abs;
    var sqrt = Math.sqrt;
    var exp = Math.exp;
    var ln = Math.log;
    var log10 = log10;
    var log2  = Math.log2;
    var pow = Math.pow;
    var sin = Math.sin;
    var cos = Math.cos;
    var tan =  Math.tan;
    var atan = Math.atan;
    var atan2 = Math.atan2;
    var asin = Math.asin;
    var acos = Math.acos;
    var sinh = Math.sinh;
    var cosh = Math.cosh;
    var acosh = Math.acosh;
    var asinh = Math.asinh;
    var tanh = Math.tanh;
    var Result;
    eval("Result = function (x){ return (" + codeText + ");};");
    return Result;
}

function GetRemezPoints(evalFunc, intervalStart, intervalEnd, degrees){
    var points = [];
    for (let i = 0; i < degrees + 2; i++) {
        // Find the Chevishev nodes and map them to our interval
        let p = (intervalStart + intervalEnd + (intervalEnd - intervalStart) * Math.cos(Math.PI * i / (degrees+1))) / 2;
        let fp = evalFunc(p);
        points.push([p, fp]);
    }
    return points;
}

function range(n){
    let Result = new Array(n);
    for(let i=0;i<n;i++){
        Result[i] = i;
    }
    return Result;
}

/**
 * linear equation solver using gauss method
 *
 * @param matrix
 * @param freeTerm
 * @returns {Array}
 */
var gauss = function (matrix, freeTerm) {
  let n = freeTerm.length,
    resX = new Array(n);

  var swap = function (x, y) {
    let tmp = 0;
    for (let i = 0; i < n; i++) {
      tmp = matrix[x][i];
      matrix[x][i] = matrix[y][i];
      matrix[y][i] = tmp;
    }
    tmp = freeTerm[x];
    freeTerm[x] = freeTerm[y];
    freeTerm[y] = tmp;
  };

  // Straight course
  for (let i = 0; i < n - 1; i++) {
    if (matrix[i][i] === 0) {
      for (let j = i + 1; j < n && matrix[i][i] === 0; j++) {
        if (matrix[j][i] !== 0) {
          swap(i, j);
        }
      }
    }
    for (let j = i + 1; j < n; j++) {
      let coef = matrix[j][i] / matrix[i][i];
      for (let k = i; k < n; k++) {
        matrix[j][k] -= matrix[i][k] * coef;
      }
      freeTerm[j] -= freeTerm[i] * coef;
    }
  }

  // Reverse course
  resX[n - 1] = freeTerm[n - 1] / matrix[n - 1][n - 1];
  for (let i = n - 2; i >= 0; i--) {
    resX[i] = 0.0;
    for (let j = i + 1; j < n; j++) {
      resX[i] += matrix[i][j] * resX[j];
    }
    resX[i] = (freeTerm[i] - resX[i]) / matrix[i][i];
  }

  return resX;
};

var polynomialToFunc = function(coeffs) {
    return function(x){   
        var Result = coeffs[coeffs.length-1];
        for(let i=coeffs.length - 2 ;i>=0; i--){
            Result = coeffs[i] + x * Result;
        }
        return Result;
    }
};

var polynomialToCode = function(coeffs){
    var Result = coeffs[coeffs.length-1].toString();
    for(let i=coeffs.length - 2 ;i>=0; i--){
        Result = coeffs[i].toString() + " + x*(" + Result + ")";
    }
    Result = "y = " + Result;
    return Result;
}


/**
 * Least Squares approximation method
 *
 * @param points points of func to be approx
 * @param degree approx polynomial degree
 *
 * @returns Array coefficients of polynomial
 */
var leastSquaresPolynomial = function (points, degree) {
  let total = points.length,
    tmp = 0;

  let matrix = new Array(degree),
    freeTerm = [];
  for (let j = 1; j <= degree; j++) {
    matrix[j - 1] = [];
    for (let i = 1; i <= degree; i++) {
      tmp = 0;
      for (let l = 1; l < total; l++) {
        tmp += Math.pow(points[l][0], i + j - 2);
      }
      matrix[j - 1].push(tmp);
    }

    tmp = 0;
    for (let l = 1; l < total; l++) {
      tmp += points[l][1] * Math.pow(points[l][0], j - 1);
    }
    freeTerm.push(tmp);
  }

  return gauss(matrix, freeTerm);
};

/**
 * Remez approximation algorithm - https://en.wikipedia.org/wiki/Remez_algorithm
 *
 * @param points points of func to be approx
 *
 * @returns Array coefficients of polynomial
 */
var remezPolynomial = function (points, origFunc) {
    // todo: add point changing and iterations?
    let total = points.length;
    let degree = total - 2;
    let freeTerm = points.map(point => point[1]);

    let matrix = points.map((point, index) =>
        range(degree + 2)
          .map(i =>
            (degree - i >= 0) ? Math.pow(point[0], degree - i) : Math.pow(-1, index)
        ) // x^degree, x^degree-1, ..., x^0, -1^row
    );

    // Get the tentative polynomial coefficients
    let coeffs = gauss(matrix, freeTerm).slice(0, -1).reverse();

    /*
    // Check errors in generated coefficients
    let ResultFunc = polynomialToFunc(coeffs);
    let errors = new Array(total);
    for(let i=0;i<total; i++){
        errors[i] = origFunc(points[i][0]) - ResultFunc(points[i][0]);
    } 
    console.log(errors);
    */

    return coeffs;
};

function PaintAbsError(canvas, intervalS, intervalE, origF, approxF){
    var ctx = canvas.getContext('2d');

    let pointCnt = canvas.width;
    let points = new Array(pointCnt);
    let maxErr = Number.MIN_VALUE;

    for(let i=0; i<pointCnt;i++){
        let x = intervalS + i/(pointCnt-1) * (intervalE-intervalS);
        let y0 = origF(x);
        let y1 = approxF(x);
        let err = Math.abs(y1 - y0);
        maxErr = Math.max(maxErr, err);
        points[i] = err;
    }

    maxErr *= 1.1;

    // Map points to canvas coords
    for(let i=0;i<pointCnt;i++){
        points[i] = points[i] / maxErr  * canvas.height;
    }

    ctx.fillStyle = "#eee";
    ctx.fillRect(0,0,canvas.width, canvas.height);

    ctx.strokeStyle = "#0F0";
    ctx.beginPath();
    for(let i=0;i<pointCnt;i++){
        ctx.lineTo(i, canvas.height - points[i]);
    }
    ctx.stroke();
}

function PaintFunctions(canvas, intervalS, intervalE, origF, approxF){
    var ctx = canvas.getContext('2d');

    let pointCnt = canvas.width;
    let points = new Array(pointCnt);
    let minY = Number.MAX_VALUE;
    let maxY = -Number.MAX_VALUE;

    for(let i=0; i<pointCnt;i++){
        let x = intervalS + i/(pointCnt-1) * (intervalE-intervalS);
        let y0 = origF(x);
        let y1 = approxF(x);
        minY = Math.min(minY, y0, y1);
        maxY = Math.max(maxY, y0, y1);
        points[i] = {x:x, y0:y0, y1:y1};
    }

    let dist = maxY - minY;

    maxY += dist * 0.1;
    minY -= dist * 0.1;

    // Map points to canvas coords
    let canvasPoints = new Array(pointCnt);
    for(let i=0;i<pointCnt;i++){
        let y0 = points[i].y0;
        let y1 = points[i].y1;

        let cy0 = (y0 - minY) / (maxY - minY) * canvas.height;
        let cy1 = (y1 - minY) / (maxY - minY) * canvas.height;
        canvasPoints[i] = [cy0, cy1];
    }

    ctx.fillStyle = "#eee";
    ctx.fillRect(0,0,canvas.width, canvas.height);

    ctx.strokeStyle = "#ccc";
    ctx.beginPath();
    let cy_0 = canvas.height - (0-minY / (maxY-minY) * canvas.height);
    ctx.moveTo(0, cy_0);
    ctx.lineTo(canvas.width, cy_0);
    ctx.stroke();

    ctx.strokeStyle = "#0F0";
    ctx.beginPath();
    for(let i=0;i<pointCnt;i++){
        ctx.lineTo(i, canvas.height - canvasPoints[i][0]);
    }
    ctx.stroke();
    ctx.strokeStyle = "#F00";
    ctx.beginPath();
    for(let i=0;i<pointCnt;i++){
        ctx.lineTo(i, canvas.height - canvasPoints[i][1]);
    }
    ctx.stroke();
}

function CalculateErrorValues(form, start, end, f1, f2){
    let maxErr = 0;
    let maxRelErr = 1;
    let iters = 50000; 
    for(let i=0;i<iters ;i++){
        let x = start + (end-start) * i / (iters-1);
        let err = Math.abs(f1(x) - f2(x));
        maxErr = Math.max(maxErr, err);
    }
    form.AbsErr.value = maxErr;
}

function GetCoeffs(){
    let Result = [];
    let elems = document.getElementsByClassName("coefficient");
    for(let i=0;i<elems.length;i++){
        let v = elems[i].value;
        if(v == ""){
            v= '0';
        }
        let f = parseFloat(v)
        Result.push(f);
    }
    return Result;
}

function RedrawAll(){
    let form = document.forms[0];
    let start = parseFloat(form.iStart.value);
    let end = parseFloat(form.iEnd.value);
    let expr = form.Expr.value;

    var evalFunc = EvaluateInScope(expr);

    let Coeffs = GetCoeffs();
    form.Output.value = polynomialToCode(Coeffs);

    let ResultFunc = polynomialToFunc(Coeffs);
    let canvas= document.getElementById("mainCanvas");
    PaintFunctions(canvas, start, end, evalFunc, ResultFunc);
    let errCanvas = document.getElementById("errCanvas");
    PaintAbsError(errCanvas, start, end, evalFunc, ResultFunc);
    CalculateErrorValues(form, start, end, evalFunc, ResultFunc);
}

function DegreesChanged(newValue){
    let CoeffsDiv = document.getElementById("Coefficients");
    CoeffsDiv.innerHTML = '';
    for(let i=0;i<=newValue;i++){
        let l = document.createElement("label");
        l.innerHTML = "<br/>Degree " + i + "&nbsp;";
        CoeffsDiv.appendChild(l);

        let d = document.createElement("input");
        d.type = "text";
        d.id = "Coeff_" + i;
        d.className = "coefficient";
        d.oninput = RedrawAll;
        CoeffsDiv.appendChild(d);
    }
}


function CalculateFormRemez(){
    let form = document.forms[0];
    let start = parseFloat(form.iStart.value);
    let end = parseFloat(form.iEnd.value);
    let degrees = parseInt(form.Degrees.value);
    let expr = form.Expr.value;
    
    DegreesChanged(degrees);
    var evalFunc = EvaluateInScope(expr);

    let ResultCoeffs = remezPolynomial(GetRemezPoints(evalFunc, start, end, degrees), evalFunc);
    // Display coefficients in form
    for(let i=0;i<ResultCoeffs.length;i++){
        let t = document.getElementById("Coeff_" + i);
        t.value = ResultCoeffs[i];
    }
    RedrawAll();
}

window.onload = function(){
    DegreesChanged(parseInt(document.forms[0].Degrees.value) + 1);
    document.getElementById("CalculateButton").click();
}
