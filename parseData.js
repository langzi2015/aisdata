const parseDatefunc = require("./parseDataF/newparseDate_local")
const async = require('async');

function parseData(res, callback) {


    let staticMap = res.func2;
    let filesobj = res.func1;

    let index = 0;
    async.whilst(
        function () {
            if (index == filesobj.length) {
                callback(null, staticMap)
            }
            return index < filesobj.length
        },
        function (callback) {
            let path = filesobj[index];
            parseDatefunc.readEachLine(path.file, path.datesourceType, staticMap, callback);
            index++
        },
        function (err) {

        }
    )
}


module.exports.parseData = parseData;
