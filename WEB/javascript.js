// *****************************************CONFIG*****************************************
//settings
const WIDTH = window.innerWidth;
const HEIGHT = window.innerHeight;
const VIEW_ANGLE = 45;
const ASPECT = WIDTH / HEIGHT;
const NEAR = 0.1;
const FAR = 10000;

//user settings
var maxLOD= 1;
var fow= FAR/4;

//flags
var viewChanged= 0;
var fowChanged= 0;
var lodChanged= 0;

//Global vars
var requestList= [];
var tiles= getTiles();

//*****************************************INIT*******************************************
var scene= new THREE.Scene();
scene.background = new THREE.Color( 0xbfd1e5 );

//Position the camera 5000 units over the first tile
var camera= new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
camera.position.x=tiles[Object.keys(tiles)[0]].config.center.x;
camera.position.y=tiles[Object.keys(tiles)[0]].config.center.y;
camera.position.z=tiles[Object.keys(tiles)[0]].config.center.z + 5000;
camera.up.set( 0, 1, 0 );
camera.updateProjectionMatrix()
scene.add(camera);

var renderer= new THREE.WebGLRenderer();
renderer.setSize(WIDTH, HEIGHT);
renderer.shadowMap.enabled= false;
document.querySelector('#mainConteiner').appendChild(renderer.domElement);

var controls = new THREE.TrackballControls(camera, renderer.domElement);
controls.rotateSpeed = 1;
controls.zoomSpeed = 5;
controls.panSpeed = 1.0;
controls.staticMoving = true;
controls.target.set(camera.position.x, camera.position.y, 0)
controls.addEventListener( 'change', function(){
	viewChanged++
	var local= viewChanged
	setTimeout(function() { processViewChanged(local) }, 500);
});

//Force tile update
setTimeout(function() { updateTiles() }, 500);
setTimeout(function() { updateTiles() }, 1000);

//*****************************************************************************************
//**************************************ANIMATION LOOP*************************************
function animate(){
	controls.update();
	renderer.render(scene, camera);
	requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
//*****************************************************************************************
//************************************Manage tiles*****************************************
function updateTiles(){
	
	//Terminate all unfinished ajax requests
	for(var i=0; i<requestList.length; i++){
		requestList[i].abort()
	}
	requestList= [];
	
	//Camera viewing frustrum
	var frustum = new THREE.Frustum();
	frustum.setFromMatrix( new THREE.Matrix4().multiplyMatrices( camera.projectionMatrix, camera.matrixWorldInverse ));
	
	//Loop trough all tiles
	var keys= Object.keys(tiles)
	for( var i=0; i<keys.length; i++ ){
		var tile= tiles[keys[i]];
		
		//Check if center of current tile is inside camera frustrum
		if( frustum.containsPoint( tile.config.center ) ){
			//Render tile
			if( tiles[keys[i]].tree == null ) tiles[keys[i]].tree= makeTree(tile.config.minX, tile.config.maxX, tile.config.minY, tile.config.maxY, keys[i], "r", tile.config.depth)
			else updateTree(tiles[keys[i]].tree, false);
		} else {
			//Do not render tile - delete if already rendered
			if(tiles[keys[i]].tree != null) updateTree(tiles[keys[i]].tree, true)
		}
	}
}


//******************************Quad treee create and modify******************************
function makeTree(minX, maxX, minY, maxY, folder, file, depthRemaining){
	if( depthRemaining < 0 ) return null;
	
	var node= {}
	node.folder= folder
	node.filename= file;
	node.points= null
    node.center= new THREE.Vector3((minX+maxX)/2, (minY+maxY)/2, 0)
	
	//Make child nodes
	node.c0= makeTree(minX, node.center.x, minY, node.center.y, folder, file+"0", depthRemaining-1)
	node.c1= makeTree(minX, node.center.x, node.center.y, maxY, folder, file+"1", depthRemaining-1)
	node.c2= makeTree(node.center.x, maxX, minY, node.center.y, folder, file+"2", depthRemaining-1)
	node.c3= makeTree(node.center.x, maxX, node.center.y, maxY, folder, file+"3", depthRemaining-1)
	
	return node;
}

function updateTree(node, del){
	
	//Calculate distance from camera to node center
	var distance= camera.position.distanceTo(node.center)
	
	//For FOW
	var limit= FAR - ((node.filename.length-1) * fow)
	
	if( distance <= limit && (node.filename.length) <= maxLOD && !del ){
		//Render node
		if( node.points == null ){
			
			//Request points from server
			getPoints(node.folder + "/" + node.filename, function(data){
				if(node.points == null){
					node.points= data
					scene.add(data)
				}
			})
		}
		
		//Check childs if they exist
		if( node.c0 != null ){
			updateTree(node.c0, false)
			updateTree(node.c1, false)
			updateTree(node.c2, false)
			updateTree(node.c3, false)
		}
		
	} else {
		//Do not render node - delete if already rendered
		if( node.points != null ){
			scene.remove(node.points)
			node.points= null;
		}
		
		//Check childs if they exist
		if( node.c0 != null ){
			updateTree(node.c0, true)
			updateTree(node.c1, true)
			updateTree(node.c2, true)
			updateTree(node.c3, true)
		}
	}
}

function getPoints( name, exec ){
	var xhttp = new XMLHttpRequest();
	xhttp.responseType = "arraybuffer";
	xhttp.open("GET", "data/" + name, true);
	
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
			
			var geometry = new THREE.BufferGeometry();
			geometry.addAttribute( 'position', new THREE.Float32BufferAttribute( positions, 3 ) );
			geometry.addAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );
			geometry.computeBoundingSphere();
			
			var material = new THREE.PointsMaterial( { size: 15, vertexColors: THREE.VertexColors } );
			material.size= 3.0;
			
			var points = new THREE.Points( geometry, material );
			exec( points )
			
			requestList.splice(requestList.indexOf(this), 1);
		}}
	
	requestList.push(xhttp)
	xhttp.send();
}

//***************************Read configuration files from server*************************
function getConfig(dir){
	var xhttp = new XMLHttpRequest();
	xhttp.open("GET", "data/" + dir + "/config.txt", false);
	xhttp.send();
	
	if( xhttp.status != 200 ) return null;
	
	var tmp= xhttp.responseText.split("\n")
	data= {}
	data.depth= parseInt(tmp[0], 10)
	data.minX= parseInt(tmp[1], 10)
	data.maxX= parseInt(tmp[2], 10)
	data.minY= parseInt(tmp[3], 10)
	data.maxY= parseInt(tmp[4], 10)
	data.minZ= parseInt(tmp[5], 10)
	data.maxZ= parseInt(tmp[6], 10)
	
	return data
}

function getTiles(dir){
	var xhttp = new XMLHttpRequest();
	xhttp.open("GET", "data/tiles.txt", false);
	xhttp.send();
	
	if( xhttp.status != 200 ) return null;
	
	data1= {}
	var lines= xhttp.responseText.split("\n")
	
	for( var i=0; i< lines.length; i++){
		if( lines[i].trim().length != 0 ){
			var tmpConf= getConfig(lines[i]);
			tmpConf.center=  new THREE.Vector3((tmpConf.minX+tmpConf.maxX)/2, (tmpConf.minY+tmpConf.maxY)/2, (tmpConf.minZ+tmpConf.maxZ)/2)
			data1[ [lines[i]] ]= {config: tmpConf, tree: null}
			//Calculate tile center
		}
	}
	return data1
}

//****************************************FullScreen***************************************
document.body.addEventListener("keydown", function(e){
	if( e.which == 70){	// F
		if(THREEx.FullScreen.activated()){
			THREEx.FullScreen.cancel();
		} else {
			THREEx.FullScreen.request();
		}
	}
}, false);

window.addEventListener( 'resize', function(){
	camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}, false );

//***********************Sliders and EventListeners for FOW and LOD*************************
var sliderFOW= document.getElementById("rangeFOW");
sliderFOW.min= 1000;
sliderFOW.max= FAR/2;
sliderFOW.value= fow;
sliderFOW.oninput= function(){
	//Values are inverted
	fow= FAR/2 - this.value
	
	fowChanged++;
	var local= fowChanged
	setTimeout(function() { processFOVchange(local) }, 500);
}

var sliderLOD= document.getElementById("rangeLOD");
sliderLOD.min= 1;
sliderLOD.max= tiles["0,0"].config.depth;	//pazi
sliderLOD.value= 1;
sliderLOD.oninput= function(){
	maxLOD= this.value
	
	lodChanged++;
	var local= lodChanged
	setTimeout(function() { processLODchange(local) }, 500);
}

function processFOVchange(par){
	if(fowChanged == par){
		updateTiles();
	}
}

function processLODchange(par){
	if(lodChanged == par){
		updateTiles();
	}
}

function processViewChanged(par){
	if(viewChanged == par){
		updateTiles();
	}
}

// Just for testing
function buf2hex(buffer) {
	return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('');
}
