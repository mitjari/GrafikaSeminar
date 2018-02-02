importScripts("libs/subworkers.js");
importScripts('libs/three/three.js');

self.onmessage=function(message){
	if( message.data.task == "make" ){
		var tmp= message.data.payload
		makeTree( tmp.minX, tmp.maxX, tmp.minY, tmp.maxY, tmp.folder, tmp.file, tmp.depth );
	} else if( message.data.task == "update" ){
		updateTree(message.data.payload.node, new THREE.Vector3(message.data.payload.cameraPos.x, message.data.payload.cameraPos.y, message.data.payload.cameraPos.z), 2000, 1, false)
	}
}

function makeTree(minX, maxX, minY, maxY, folder, file, depthRemaining){
	if( depthRemaining < 0 ) return null;
	
	var node= {}
	node.folder= folder
	node.filename= file;
	node.points= null
    node.center= new THREE.Vector3((minX+maxX)/2, (minY+maxY)/2, 0)
	
	node.c0= makeTree(minX, node.center.x, minY, node.center.y, folder, file+"0", depthRemaining-1)
	node.c1= makeTree(minX, node.center.x, node.center.y, maxY, folder, file+"1", depthRemaining-1)
	node.c2= makeTree(node.center.x, maxX, minY, node.center.y, folder, file+"2", depthRemaining-1)
	node.c3= makeTree(node.center.x, maxX, node.center.y, maxY, folder, file+"3", depthRemaining-1)
	
	self.postMessage(node)
}

function updateTree(node, cameraPos, fow, maxLOD, del){
	
	//Calculate distance from camera
	var distance= cameraPos.distanceTo(node.center)
	
	var limit= (4000-(node.filename.length-1))*fow
	
	if( distance <= limit && (node.filename.length) <= maxLOD && !del ){
		//Include current node
		//Check if already present and load if not
		if( node.points == null ){
			//Request points from server
			getNode(node.folder + "/" + node.filename, function(_data){
				if(node.points == null){
					//Signal main thread to ad points to scene
					self.postMessage({task: "addPoints", data: _data})
				}
			})
		}
		
		//Check childes if they exist
		if( node.c0 != null ){
			updateTree(node.c0, cameraPos, fow, maxLOD, false)
			updateTree(node.c1, cameraPos, fow, maxLOD, false)
			updateTree(node.c2, cameraPos, fow, maxLOD, false)
			updateTree(node.c3, cameraPos, fow, maxLOD, false)
		}
		
	} else {
		//Curent node is to far away to render
		//Check if already present and delete it if it is
		if( node.points != null ){
			self.postMessage({task: "removePoints", data: node.points});
			node.points= null;
		}
		
		//Check childes if they exist
		if( node.c0 != null ){
			updateTree(node.c0, cameraPos, fow, maxLOD, true)
			updateTree(node.c1, cameraPos, fow, maxLOD, true)
			updateTree(node.c2, cameraPos, fow, maxLOD, true)
			updateTree(node.c3, cameraPos, fow, maxLOD, true)
		}
	}
}

function getNode( name, exec ){
	var worker= new Worker("w_getNode.js");
	worker.onmessage= function(message){
		exec(message.data)
	}
	worker.postMessage(name)
}