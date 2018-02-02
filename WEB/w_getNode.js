importScripts("libs/three/three.js");
importScripts("libs/subworkers.js");
importScripts('libs/pako.js');

self.onmessage=function(message){	
	var xhttp = new XMLHttpRequest();
	xhttp.responseType = "arraybuffer";
	xhttp.open("GET", "data/" + message.data, true);
	
	xhttp.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200) {
			
			var inflated= pako.inflate(this.response).buffer;
			
			//Point buffers
			var positions = [];
			var colors = [];
			
			var pointBytes= 14
			for(var i=0; i<inflated.byteLength/pointBytes; i++){
				//Process single point
				var view= new DataView(inflated.slice(pointBytes*i, pointBytes*i+pointBytes));
				
				//Decode x,y,z and intensity
				positions.push(view.getUint32(0,true), view.getUint32(4,true), view.getUint32(8,true));
				
				var intTmp= view.getUint16(12,true)/255
				colors.push(intTmp, intTmp, intTmp);
			}
			
			self.postMessage([positions, colors])
			close();
	}};
	
	xhttp.send();
}