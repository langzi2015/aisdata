/*
 解析Ais报文（2015版）
 */
var Async = require("async");
var AisDecode  = require ("../AisDecode/blmParser.js").aisDecode;
var Map = require("../blmutil/Map.js");
var LineReader = require('line-reader');
var Util = require('util');
var FileSys = require('fs');
var InDir = require("./filepathConf.js").indir;
var OutDir = require("./filepathConf.js").outdir;
var BlmLog = require('../blmlog/BlmLog.js').blmlog;
var AisObject = require("../AisDecode/AisObject.js");
var TimeUtil = require("../blmutil/TimeUtil.js");
var WriteToFile = require("./BlmFile.js").writeToFile;
var SrcId = require('./filepathConf.js').srcid;

/*
 开始解析
 */
function DecodeAisFromFile2015(){
	var pathArr = FileSys.readdirSync(InDir);
	var mapAisLast = new Map();
	var len = pathArr.length;
	var i = 0;

    FileSys.writeFile('./temp.txt', '', (err) => {
        if (err) {
            console.log('write error');
        }
        else {
            console.log('clear temp file');
        }
    });

	Async.whilst(
		function(){
			return i < len;
		},
		function(cb){
			BlmLog.info(Util.format("[%s] file start, time is %s.",
				pathArr[i], TimeUtil.dateFormat(new Date(), "YYYY-MM-DD HH:mm:ss")));
			var filenameNow = pathArr[i];
			i ++;
			var logtime = 0;
			var oldtime = 0;
			var count = 0;
			var aisPacket = "";

			LineReader.eachLine(InDir + filenameNow, function(line, last){
				if(last)
				{
					BlmLog.info(Util.format("[%s] file end, time is %s, counter is %s.",
						filenameNow, TimeUtil.dateFormat(new Date(), "YYYY-MM-DD HH:mm:ss"), count));
					cb(null);
				}

				var time = 0;
				var timeIndex = line.indexOf(";");
				var vdmIndex = line.indexOf("!");
				if(vdmIndex < 0)
					return;

				var tmpTime = line.substring(0, timeIndex);
				var tmpGmt = new Date(Util.format("%s-%s-%s %s:%s:%s",
					tmpTime.substring(0, 4), tmpTime.substring(5, 7), tmpTime.substring(8, 10),
					tmpTime.substring(11, 13), tmpTime.substring(14, 16), tmpTime.substring(17, 19)));
				var timetemp = Math.round(tmpGmt.getTime()/1000);

				if(vdmIndex > timeIndex && timetemp > 1000000000)
				{
					time = timetemp;
					aisPacket=line.substring(vdmIndex, line.length);
				}
				else
				{
					time = oldtime;
					aisPacket=line.substring(vdmIndex, line.length);
				}

				oldtime = oldtime == 0 ? time : oldtime;
				logtime = (time - logtime) > 60*30 ? time : logtime;

				var aisData = AisDecode(time, aisPacket);

				if (aisData != null)
				{
					count ++;
					var mmsi = aisData.mmsi;
					var aisTime = aisData.time;

					if(mmsi < 100000000 || mmsi > 999999999)
						return;

					if(aisTime<1000000000 || aisTime>9999999999)
						return;

					var lastData = mapAisLast.get(mmsi);

					if(aisData.packetType == 0)//动态
					{
						if(lastData == null)
						{
							lastData = new AisObject();
							mapAisLast.put(mmsi, lastData);
						}

						lastData.mmsi = aisData.mmsi;
						lastData.time = aisData.time;
						lastData.classType = aisData.classType; //报告类型 A or B
						lastData.messageType = aisData.messageType; //ais报文类型 1-27
						lastData.speed = aisData.speed;
						lastData.status = aisData.status;//航行状态
						lastData.rot = aisData.rot;//转向率
						lastData.acc = aisData.acc;//位置的准确度
						lastData.x = aisData.x;//经度
						lastData.y = aisData.y;//纬度
						lastData.course = aisData.course;//航向
						lastData.headcourse = aisData.headcourse;//船首向
						lastData.secondutc = aisData.secondutc;//Second of UTC timestamp
					}

					if(aisData.packetType == 1)//静态
					{
						if(lastData != null)
						{
							lastData.mmsi = aisData.mmsi;
							lastData.imo = aisData.imo!=""?aisData.imo:"";
							lastData.callsign = aisData.callsign!=""?aisData.callsign:"";
							lastData.shipname = aisData.shipname!=""?aisData.shipname:"";
							lastData.cargo = aisData.cargo!=0?aisData.cargo:0;//货物类型
							lastData.length = aisData.length>0?aisData.length:0;//米
							lastData.width = aisData.width>0?aisData.width:0;//米
							lastData.draught = aisData.draught>0?aisData.draught:0;//吃水
							lastData.eta = aisData.eta;
							lastData.dest = aisData.dest;//目的港
						}

						return;
					}

					if(aisData.packetType==2)//动静
					{
						if(lastData == null)
						{
							lastData = new AisObject();
							mapAisLast.put(mmsi, lastData);
						}

						lastData.mmsi = aisData.mmsi;
						lastData.time=aisData.time;
						lastData.classType=aisData.classType; //报告类型 A or B
						lastData.messageType=aisData.messageType; //ais报文类型 1-27
						lastData.speed=aisData.speed;
						lastData.status=aisData.status;//航行状态
						lastData.rot=aisData.rot;//转向率
						lastData.acc=aisData.acc;//位置的准确度
						lastData.x=aisData.x;//经度
						lastData.y=aisData.y;//纬度
						lastData.course=aisData.course;//航向
						lastData.headcourse=aisData.headcourse;//船首向
						lastData.secondutc=aisData.secondutc;//Second of UTC timestamp

						lastData.imo=aisData.imo!=""?aisData.imo:"";
						lastData.callsign=aisData.callsign!=""?aisData.callsign:"";
						lastData.shipname=aisData.shipname!=""?aisData.shipname:"";
						lastData.cargo=aisData.cargo!=0?aisData.cargo:0;//货物类型
						lastData.length=aisData.length>0?aisData.length:0;//米
						lastData.width=aisData.width>0?aisData.width:0;//米
						lastData.draught=aisData.draught>0?aisData.draught:0;//吃水
						lastData.eta=aisData.eta;
						lastData.dest=aisData.dest;//目的港
					}

					lastData.srcid = SrcId;
					var key = lastData.toRangKey();
					var value = lastData.toHypertableValue();
					var htString = Util.format("%s\tdescription\t%s\n", key, value);
					WriteToFile(OutDir + filenameNow + '.tsv', htString);
				}
			});
		},
		function(err) {
            twiceParse();
			BlmLog.info(Util.format("first All end, time is %s.", TimeUtil.dateFormat(new Date(), "YYYY-MM-DD HH:mm:ss")));
		});
}

function twiceParse() {
	FileSys.readFile('./temp.txt', 'utf-8', function(error, data) {
		if (error){
			console.log("error for reading" + error.message);
		}
		else{
			var all_data=data.split('\n');
			all_data.splice(all_data.length-1,1);
			//console.log(all_data);
            var count=0;
            var mapAisLast = new Map();
			for(var i=0;i<all_data.length;i++){
				var time=all_data[i].split('+-*/=')[0];
				var message=all_data[i].split('+-*/=')[1];
				var flags = message.split(",");
				var temp_one_mes=[];
				temp_one_mes.push({
					time:time,
					data:message,
					flag_x:parseInt(flags[1]),
					flag_y:parseInt(flags[2]),
					flag_z:parseInt(flags[3])
				});
				for(var j=i+1;j<all_data.length;j++){
					var time_contrast=all_data[j].split('+-*/=')[0];
					var message_contrast=all_data[j].split('+-*/=')[1];
					var flags_contrast = message_contrast.split(",");
					if(flags[1]==flags_contrast[1]&&flags[3]==flags_contrast[3]){
						temp_one_mes.push({
							time:time_contrast,
							data:message_contrast,
							flag_x:parseInt(flags_contrast[1]),
							flag_y:parseInt(flags_contrast[2]),
							flag_z:parseInt(flags_contrast[3])
						});
						all_data.splice(j,1);
					}
					if(temp_one_mes.length==temp_one_mes[0].flag_x){
						break;
					}
				}
				temp_one_mes.sort(compare('flag_y'));
				var after_mes='';
				for(var k=0;k<temp_one_mes.length;k++){
				    after_mes+=temp_one_mes[k].data.split(',')[5];
                }
				var split_mes=temp_one_mes[0].data.split(',');
				split_mes[1]='1';
				split_mes[2]='1';
                split_mes[3]='';
                split_mes[5]=after_mes;
                var joint_mes=split_mes.join(',');
                var aisData = AisDecode(temp_one_mes[0].time, joint_mes);

                if (aisData != null) {
                    count ++;
                    var mmsi = aisData.mmsi;
                    var aisTime = aisData.time;

                    if(mmsi < 100000000 || mmsi > 999999999)
                        return;

                    if(aisTime<1000000000 || aisTime>9999999999)
                        return;

                    var lastData = mapAisLast.get(mmsi);

                    if(aisData.packetType == 0){//动态
                        if(lastData == null) {
                            lastData = new AisObject();
                            mapAisLast.put(mmsi, lastData);
                        }

                        lastData.mmsi = aisData.mmsi;
                        lastData.time = aisData.time;
                        lastData.classType = aisData.classType; //报告类型 A or B
                        lastData.messageType = aisData.messageType; //ais报文类型 1-27
                        lastData.speed = aisData.speed;
                        lastData.status = aisData.status;//航行状态
                        lastData.rot = aisData.rot;//转向率
                        lastData.acc = aisData.acc;//位置的准确度
                        lastData.x = aisData.x;//经度
                        lastData.y = aisData.y;//纬度
                        lastData.course = aisData.course;//航向
                        lastData.headcourse = aisData.headcourse;//船首向
                        lastData.secondutc = aisData.secondutc;//Second of UTC timestamp
                    }

                    if(aisData.packetType == 1){//静态
                        if(lastData != null) {
                            lastData.mmsi = aisData.mmsi;
                            lastData.imo = aisData.imo!=""?aisData.imo:"";
                            lastData.callsign = aisData.callsign!=""?aisData.callsign:"";
                            lastData.shipname = aisData.shipname!=""?aisData.shipname:"";
                            lastData.cargo = aisData.cargo!=0?aisData.cargo:0;//货物类型
                            lastData.length = aisData.length>0?aisData.length:0;//米
                            lastData.width = aisData.width>0?aisData.width:0;//米
                            lastData.draught = aisData.draught>0?aisData.draught:0;//吃水
                            lastData.eta = aisData.eta;
                            lastData.dest = aisData.dest;//目的港
                        }

                        return;
                    }

                    if(aisData.packetType==2){//动静
                        if(lastData == null) {
                            lastData = new AisObject();
                            mapAisLast.put(mmsi, lastData);
                        }

                        lastData.mmsi = aisData.mmsi;
                        lastData.time=aisData.time;
                        lastData.classType=aisData.classType; //报告类型 A or B
                        lastData.messageType=aisData.messageType; //ais报文类型 1-27
                        lastData.speed=aisData.speed;
                        lastData.status=aisData.status;//航行状态
                        lastData.rot=aisData.rot;//转向率
                        lastData.acc=aisData.acc;//位置的准确度
                        lastData.x=aisData.x;//经度
                        lastData.y=aisData.y;//纬度
                        lastData.course=aisData.course;//航向
                        lastData.headcourse=aisData.headcourse;//船首向
                        lastData.secondutc=aisData.secondutc;//Second of UTC timestamp

                        lastData.imo=aisData.imo!=""?aisData.imo:"";
                        lastData.callsign=aisData.callsign!=""?aisData.callsign:"";
                        lastData.shipname=aisData.shipname!=""?aisData.shipname:"";
                        lastData.cargo=aisData.cargo!=0?aisData.cargo:0;//货物类型
                        lastData.length=aisData.length>0?aisData.length:0;//米
                        lastData.width=aisData.width>0?aisData.width:0;//米
                        lastData.draught=aisData.draught>0?aisData.draught:0;//吃水
                        lastData.eta=aisData.eta;
                        lastData.dest=aisData.dest;//目的港
                    }

                    lastData.srcid = SrcId;
                    var key = lastData.toRangKey();
                    var value = lastData.toHypertableValue();
                    var htString = Util.format("%s\tdescription\t%s\n", key, value);
                    WriteToFile(OutDir + 'lastData.tsv', htString);
                }
			}
		}
        BlmLog.info(Util.format("last All end, time is %s.", TimeUtil.dateFormat(new Date(), "YYYY-MM-DD HH:mm:ss")));
    });
}

function compare(p) {
	return function(m,n){
		var a = m[p];
		var b = n[p];
		if(a < b){
			return -1;
		}
		else{
			return 1;
		}
	}
}

DecodeAisFromFile2015();
