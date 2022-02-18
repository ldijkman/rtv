Root.allDescriptors.push(...[{"dependencies":["components","emulation"],"extensions":[{"className":"Screencast.ScreencastAppProvider","type":"@Common.AppProvider","order":1},{"className":"Screencast.ScreencastApp.ToolbarButtonProvider","type":"@UI.ToolbarItem.Provider","order":1,"location":"main-toolbar-left"},{"actionId":"components.request-app-banner","type":"context-menu-item","location":"mainMenu","order":10}],"name":"screencast"}]);Root.applicationDescriptor.modules.push(...[{"type":"autostart","name":"screencast"}])
self['Screencast']=self['Screencast']||{};Screencast.InputModel=class extends SDK.SDKModel{constructor(target){super(target);this._inputAgent=target.inputAgent();this._activeTouchOffsetTop=null;this._activeTouchParams=null;}
emitKeyEvent(event){let type;switch(event.type){case'keydown':type='keyDown';break;case'keyup':type='keyUp';break;case'keypress':type='char';break;default:return;}
const text=event.type==='keypress'?String.fromCharCode(event.charCode):undefined;this._inputAgent.invoke_dispatchKeyEvent({type:type,modifiers:this._modifiersForEvent(event),text:text,unmodifiedText:text?text.toLowerCase():undefined,keyIdentifier:event.keyIdentifier,code:event.code,key:event.key,windowsVirtualKeyCode:event.keyCode,nativeVirtualKeyCode:event.keyCode,autoRepeat:false,isKeypad:false,isSystemKey:false});}
emitTouchFromMouseEvent(event,offsetTop,zoom){const buttons={0:'none',1:'left',2:'middle',3:'right'};const types={'mousedown':'mousePressed','mouseup':'mouseReleased','mousemove':'mouseMoved','mousewheel':'mouseWheel'};if(!(event.type in types)||!(event.which in buttons)){return;}
if(event.type!=='mousewheel'&&buttons[event.which]==='none'){return;}
if(event.type==='mousedown'||this._activeTouchOffsetTop===null){this._activeTouchOffsetTop=offsetTop;}
const x=Math.round(event.offsetX/zoom);let y=Math.round(event.offsetY/zoom);y=Math.round(y-this._activeTouchOffsetTop);const params={type:types[event.type],x:x,y:y,modifiers:this._modifiersForEvent(event),button:buttons[event.which],clickCount:0};if(event.type==='mousewheel'){params.deltaX=event.wheelDeltaX/zoom;params.deltaY=event.wheelDeltaY/zoom;}else{this._activeTouchParams=params;}
if(event.type==='mouseup'){this._activeTouchOffsetTop=null;}
this._inputAgent.invoke_emulateTouchFromMouseEvent(params);}
cancelTouch(){if(this._activeTouchParams!==null){const params=this._activeTouchParams;this._activeTouchParams=null;params.type='mouseReleased';this._inputAgent.invoke_emulateTouchFromMouseEvent(params);}}
_modifiersForEvent(event){return(event.altKey?1:0)|(event.ctrlKey?2:0)|(event.metaKey?4:0)|(event.shiftKey?8:0);}};SDK.SDKModel.register(Screencast.InputModel,SDK.Target.Capability.Input,false);;Screencast.ScreencastApp=class{constructor(){this._enabledSetting=Common.settings.createSetting('screencastEnabled',document.location.port==9998?false:true);this._toggleButton=new UI.ToolbarToggle(Common.UIString('Toggle screencast'),'largeicon-phone');this._toggleButton.setToggled(this._enabledSetting.get());this._toggleButton.setEnabled(false);this._toggleButton.addEventListener(UI.ToolbarButton.Events.Click,this._toggleButtonClicked,this);SDK.targetManager.observeModels(SDK.ScreenCaptureModel,this);}
static _instance(){if(!Screencast.ScreencastApp._appInstance){Screencast.ScreencastApp._appInstance=new Screencast.ScreencastApp();}
return Screencast.ScreencastApp._appInstance;}
presentUI(document){const rootView=new UI.RootView();this._rootSplitWidget=new UI.SplitWidget(false,true,'InspectorView.screencastSplitViewState',300,300);this._rootSplitWidget.setVertical(true);this._rootSplitWidget.setSecondIsSidebar(true);this._rootSplitWidget.show(rootView.element);this._rootSplitWidget.hideMain();this._rootSplitWidget.setSidebarWidget(UI.inspectorView);rootView.attachToDocument(document);rootView.focus();}
modelAdded(screenCaptureModel){if(this._screenCaptureModel){return;}
this._screenCaptureModel=screenCaptureModel;this._toggleButton.setEnabled(true);this._screencastView=new Screencast.ScreencastView(screenCaptureModel);this._rootSplitWidget.setMainWidget(this._screencastView);this._screencastView.initialize();this._onScreencastEnabledChanged();}
modelRemoved(screenCaptureModel){if(this._screenCaptureModel!==screenCaptureModel){return;}
delete this._screenCaptureModel;this._toggleButton.setEnabled(false);this._screencastView.detach();delete this._screencastView;this._onScreencastEnabledChanged();}
_toggleButtonClicked(){const enabled=!this._toggleButton.toggled();this._enabledSetting.set(enabled);this._onScreencastEnabledChanged();}
_onScreencastEnabledChanged(){if(!this._rootSplitWidget){return;}
const enabled=this._enabledSetting.get()&&this._screencastView;this._toggleButton.setToggled(enabled);if(enabled){this._rootSplitWidget.showBoth();}else{this._rootSplitWidget.hideMain();}}};Screencast.ScreencastApp._appInstance;Screencast.ScreencastApp.ToolbarButtonProvider=class{item(){return Screencast.ScreencastApp._instance()._toggleButton;}};Screencast.ScreencastAppProvider=class{createApp(){return Screencast.ScreencastApp._instance();}};;Screencast.ScreencastView=class extends UI.VBox{constructor(screenCaptureModel){super();this._screenCaptureModel=screenCaptureModel;this._domModel=screenCaptureModel.target().model(SDK.DOMModel);this._overlayModel=screenCaptureModel.target().model(SDK.OverlayModel);this._resourceTreeModel=screenCaptureModel.target().model(SDK.ResourceTreeModel);this._networkManager=screenCaptureModel.target().model(SDK.NetworkManager);this._inputModel=screenCaptureModel.target().model(Screencast.InputModel);this.setMinimumSize(150,150);this.registerRequiredCSS('screencast/screencastView.css');}
initialize(){this.element.classList.add('screencast');this._createNavigationBar();this._viewportElement=this.element.createChild('div','screencast-viewport hidden');this._canvasContainerElement=this._viewportElement.createChild('div','screencast-canvas-container');this._glassPaneElement=this._canvasContainerElement.createChild('div','screencast-glasspane fill hidden');this._canvasElement=this._canvasContainerElement.createChild('canvas');this._canvasElement.tabIndex=0;this._canvasElement.addEventListener('mousedown',this._handleMouseEvent.bind(this),false);this._canvasElement.addEventListener('mouseup',this._handleMouseEvent.bind(this),false);this._canvasElement.addEventListener('mousemove',this._handleMouseEvent.bind(this),false);this._canvasElement.addEventListener('mousewheel',this._handleMouseEvent.bind(this),false);this._canvasElement.addEventListener('click',this._handleMouseEvent.bind(this),false);this._canvasElement.addEventListener('contextmenu',this._handleContextMenuEvent.bind(this),false);this._canvasElement.addEventListener('keydown',this._handleKeyEvent.bind(this),false);this._canvasElement.addEventListener('keyup',this._handleKeyEvent.bind(this),false);this._canvasElement.addEventListener('keypress',this._handleKeyEvent.bind(this),false);this._canvasElement.addEventListener('blur',this._handleBlurEvent.bind(this),false);this._titleElement=this._canvasContainerElement.createChild('div','screencast-element-title monospace hidden');this._tagNameElement=this._titleElement.createChild('span','screencast-tag-name');this._nodeIdElement=this._titleElement.createChild('span','screencast-node-id');this._classNameElement=this._titleElement.createChild('span','screencast-class-name');this._titleElement.createTextChild(' ');this._nodeWidthElement=this._titleElement.createChild('span');this._titleElement.createChild('span','screencast-px').textContent='px';this._titleElement.createTextChild(' \u00D7 ');this._nodeHeightElement=this._titleElement.createChild('span');this._titleElement.createChild('span','screencast-px').textContent='px';this._titleElement.style.top='0';this._titleElement.style.left='0';this._imageElement=new Image();this._isCasting=false;this._context=this._canvasElement.getContext('2d');this._checkerboardPattern=this._createCheckerboardPattern(this._context);this._shortcuts=({});this._shortcuts[UI.KeyboardShortcut.makeKey('l',UI.KeyboardShortcut.Modifiers.Ctrl)]=this._focusNavigationBar.bind(this);SDK.targetManager.addEventListener(SDK.TargetManager.Events.SuspendStateChanged,this._onSuspendStateChange,this);this._updateGlasspane();}
wasShown(){this._startCasting();}
willHide(){this._stopCasting();}
_startCasting(){if(SDK.targetManager.allTargetsSuspended()){return;}
if(this._isCasting){return;}
this._isCasting=true;const maxImageDimension=2048;const dimensions=this._viewportDimensions();if(dimensions.width<0||dimensions.height<0){this._isCasting=false;return;}
dimensions.width*=window.devicePixelRatio;dimensions.height*=window.devicePixelRatio;this._screenCaptureModel.startScreencast('jpeg',80,Math.floor(Math.min(maxImageDimension,dimensions.width)),Math.floor(Math.min(maxImageDimension,dimensions.height)),undefined,this._screencastFrame.bind(this),this._screencastVisibilityChanged.bind(this));for(const emulationModel of SDK.targetManager.models(SDK.EmulationModel)){emulationModel.overrideEmulateTouch(true);}
if(this._overlayModel){this._overlayModel.setHighlighter(this);}}
_stopCasting(){if(!this._isCasting){return;}
this._isCasting=false;this._screenCaptureModel.stopScreencast();for(const emulationModel of SDK.targetManager.models(SDK.EmulationModel)){emulationModel.overrideEmulateTouch(false);}
if(this._overlayModel){this._overlayModel.setHighlighter(null);}}
_screencastFrame(base64Data,metadata){this._imageElement.onload=()=>{this._pageScaleFactor=metadata.pageScaleFactor;this._screenOffsetTop=metadata.offsetTop;this._scrollOffsetX=metadata.scrollOffsetX;this._scrollOffsetY=metadata.scrollOffsetY;const deviceSizeRatio=metadata.deviceHeight/metadata.deviceWidth;const dimensionsCSS=this._viewportDimensions();this._imageZoom=Math.min(dimensionsCSS.width/this._imageElement.naturalWidth,dimensionsCSS.height/(this._imageElement.naturalWidth*deviceSizeRatio));this._viewportElement.classList.remove('hidden');const bordersSize=Screencast.ScreencastView._bordersSize;if(this._imageZoom<1.01/window.devicePixelRatio){this._imageZoom=1/window.devicePixelRatio;}
this._screenZoom=this._imageElement.naturalWidth*this._imageZoom/metadata.deviceWidth;this._viewportElement.style.width=metadata.deviceWidth*this._screenZoom+bordersSize+'px';this._viewportElement.style.height=metadata.deviceHeight*this._screenZoom+bordersSize+'px';this.highlightInOverlay({node:this._highlightNode},this._highlightConfig);};this._imageElement.src='data:image/jpg;base64,'+base64Data;}
_isGlassPaneActive(){return!this._glassPaneElement.classList.contains('hidden');}
_screencastVisibilityChanged(visible){this._targetInactive=!visible;this._updateGlasspane();}
_onSuspendStateChange(event){if(SDK.targetManager.allTargetsSuspended()){this._stopCasting();}else{this._startCasting();}
this._updateGlasspane();}
_updateGlasspane(){if(this._targetInactive){this._glassPaneElement.textContent=Common.UIString('The tab is inactive');this._glassPaneElement.classList.remove('hidden');}else if(SDK.targetManager.allTargetsSuspended()){this._glassPaneElement.textContent=Common.UIString('Profiling in progress');this._glassPaneElement.classList.remove('hidden');}else{this._glassPaneElement.classList.add('hidden');}}
async _handleMouseEvent(event){if(this._isGlassPaneActive()){event.consume();return;}
if(!this._pageScaleFactor||!this._domModel){return;}
if(!this._inspectModeConfig||event.type==='mousewheel'){if(this._inputModel){this._inputModel.emitTouchFromMouseEvent(event,this._screenOffsetTop,this._screenZoom);}
event.preventDefault();if(event.type==='mousedown'){this._canvasElement.focus();}
return;}
const position=this._convertIntoScreenSpace(event);const node=await this._domModel.nodeForLocation(Math.floor(position.x/this._pageScaleFactor+this._scrollOffsetX),Math.floor(position.y/this._pageScaleFactor+this._scrollOffsetY),Common.moduleSetting('showUAShadowDOM').get());if(!node){return;}
if(event.type==='mousemove'){this.highlightInOverlay({node},this._inspectModeConfig);this._domModel.overlayModel().nodeHighlightRequested(node.id);}else if(event.type==='click'){this._domModel.overlayModel().inspectNodeRequested(node.backendNodeId());}}
_handleKeyEvent(event){if(this._isGlassPaneActive()){event.consume();return;}
const shortcutKey=UI.KeyboardShortcut.makeKeyFromEvent((event));const handler=this._shortcuts[shortcutKey];if(handler&&handler(event)){event.consume();return;}
if(this._inputModel){this._inputModel.emitKeyEvent(event);}
event.consume();this._canvasElement.focus();}
_handleContextMenuEvent(event){event.consume(true);}
_handleBlurEvent(event){if(this._inputModel){this._inputModel.cancelTouch();}}
_convertIntoScreenSpace(event){const position={};position.x=Math.round(event.offsetX/this._screenZoom);position.y=Math.round(event.offsetY/this._screenZoom-this._screenOffsetTop);return position;}
onResize(){if(this._deferredCasting){clearTimeout(this._deferredCasting);delete this._deferredCasting;}
this._stopCasting();this._deferredCasting=setTimeout(this._startCasting.bind(this),100);}
highlightInOverlay(data,config){this._highlightInOverlay(data,config);}
async _highlightInOverlay(data,config){const{node:n,deferredNode,object}=data;let node=n;if(!node&&deferredNode){node=await deferredNode.resolvePromise();}
if(!node&&object){const domModel=object.runtimeModel().target().model(SDK.DOMModel);if(domModel){node=await domModel.pushObjectAsNodeToFrontend(object);}}
this._highlightNode=node;this._highlightConfig=config;if(!node){this._model=null;this._config=null;this._node=null;this._titleElement.classList.add('hidden');this._repaint();return;}
this._node=node;node.boxModel().then(model=>{if(!model||!this._pageScaleFactor){this._repaint();return;}
this._model=this._scaleModel(model);this._config=config;this._repaint();});}
_scaleModel(model){function scaleQuad(quad){for(let i=0;i<quad.length;i+=2){quad[i]=quad[i]*this._pageScaleFactor*this._screenZoom;quad[i+1]=(quad[i+1]*this._pageScaleFactor+this._screenOffsetTop)*this._screenZoom;}}
scaleQuad.call(this,model.content);scaleQuad.call(this,model.padding);scaleQuad.call(this,model.border);scaleQuad.call(this,model.margin);return model;}
_repaint(){const model=this._model;const config=this._config;const canvasWidth=this._canvasElement.getBoundingClientRect().width;const canvasHeight=this._canvasElement.getBoundingClientRect().height;this._canvasElement.width=window.devicePixelRatio*canvasWidth;this._canvasElement.height=window.devicePixelRatio*canvasHeight;this._context.save();this._context.scale(window.devicePixelRatio,window.devicePixelRatio);this._context.save();this._context.fillStyle=this._checkerboardPattern;this._context.fillRect(0,0,canvasWidth,this._screenOffsetTop*this._screenZoom);this._context.fillRect(0,this._screenOffsetTop*this._screenZoom+this._imageElement.naturalHeight*this._imageZoom,canvasWidth,canvasHeight);this._context.restore();if(model&&config){this._context.save();const transparentColor='rgba(0, 0, 0, 0)';const quads=[];if(model.content&&config.contentColor!==transparentColor){quads.push({quad:model.content,color:config.contentColor});}
if(model.padding&&config.paddingColor!==transparentColor){quads.push({quad:model.padding,color:config.paddingColor});}
if(model.border&&config.borderColor!==transparentColor){quads.push({quad:model.border,color:config.borderColor});}
if(model.margin&&config.marginColor!==transparentColor){quads.push({quad:model.margin,color:config.marginColor});}
for(let i=quads.length-1;i>0;--i){this._drawOutlinedQuadWithClip(quads[i].quad,quads[i-1].quad,quads[i].color);}
if(quads.length>0){this._drawOutlinedQuad(quads[0].quad,quads[0].color);}
this._context.restore();this._drawElementTitle();this._context.globalCompositeOperation='destination-over';}
this._context.drawImage(this._imageElement,0,this._screenOffsetTop*this._screenZoom,this._imageElement.naturalWidth*this._imageZoom,this._imageElement.naturalHeight*this._imageZoom);this._context.restore();}
_cssColor(color){if(!color){return'transparent';}
return Common.Color.fromRGBA([color.r,color.g,color.b,color.a]).asString(Common.Color.Format.RGBA)||'';}
_quadToPath(quad){this._context.beginPath();this._context.moveTo(quad[0],quad[1]);this._context.lineTo(quad[2],quad[3]);this._context.lineTo(quad[4],quad[5]);this._context.lineTo(quad[6],quad[7]);this._context.closePath();return this._context;}
_drawOutlinedQuad(quad,fillColor){this._context.save();this._context.lineWidth=2;this._quadToPath(quad).clip();this._context.fillStyle=this._cssColor(fillColor);this._context.fill();this._context.restore();}
_drawOutlinedQuadWithClip(quad,clipQuad,fillColor){this._context.fillStyle=this._cssColor(fillColor);this._context.save();this._context.lineWidth=0;this._quadToPath(quad).fill();this._context.globalCompositeOperation='destination-out';this._context.fillStyle='red';this._quadToPath(clipQuad).fill();this._context.restore();}
_drawElementTitle(){if(!this._node){return;}
const canvasWidth=this._canvasElement.getBoundingClientRect().width;const canvasHeight=this._canvasElement.getBoundingClientRect().height;const lowerCaseName=this._node.localName()||this._node.nodeName().toLowerCase();this._tagNameElement.textContent=lowerCaseName;this._nodeIdElement.textContent=this._node.getAttribute('id')?'#'+this._node.getAttribute('id'):'';this._nodeIdElement.textContent=this._node.getAttribute('id')?'#'+this._node.getAttribute('id'):'';let className=this._node.getAttribute('class');if(className&&className.length>50){className=className.substring(0,50)+'\u2026';}
this._classNameElement.textContent=className||'';this._nodeWidthElement.textContent=this._model.width;this._nodeHeightElement.textContent=this._model.height;this._titleElement.classList.remove('hidden');const titleWidth=this._titleElement.offsetWidth+6;const titleHeight=this._titleElement.offsetHeight+4;const anchorTop=this._model.margin[1];const anchorBottom=this._model.margin[7];const arrowHeight=7;let renderArrowUp=false;let renderArrowDown=false;let boxX=Math.max(2,this._model.margin[0]);if(boxX+titleWidth>canvasWidth){boxX=canvasWidth-titleWidth-2;}
let boxY;if(anchorTop>canvasHeight){boxY=canvasHeight-titleHeight-arrowHeight;renderArrowDown=true;}else if(anchorBottom<0){boxY=arrowHeight;renderArrowUp=true;}else if(anchorBottom+titleHeight+arrowHeight<canvasHeight){boxY=anchorBottom+arrowHeight-4;renderArrowUp=true;}else if(anchorTop-titleHeight-arrowHeight>0){boxY=anchorTop-titleHeight-arrowHeight+3;renderArrowDown=true;}else{boxY=arrowHeight;}
this._context.save();this._context.translate(0.5,0.5);this._context.beginPath();this._context.moveTo(boxX,boxY);if(renderArrowUp){this._context.lineTo(boxX+2*arrowHeight,boxY);this._context.lineTo(boxX+3*arrowHeight,boxY-arrowHeight);this._context.lineTo(boxX+4*arrowHeight,boxY);}
this._context.lineTo(boxX+titleWidth,boxY);this._context.lineTo(boxX+titleWidth,boxY+titleHeight);if(renderArrowDown){this._context.lineTo(boxX+4*arrowHeight,boxY+titleHeight);this._context.lineTo(boxX+3*arrowHeight,boxY+titleHeight+arrowHeight);this._context.lineTo(boxX+2*arrowHeight,boxY+titleHeight);}
this._context.lineTo(boxX,boxY+titleHeight);this._context.closePath();this._context.fillStyle='rgb(255, 255, 194)';this._context.fill();this._context.strokeStyle='rgb(128, 128, 128)';this._context.stroke();this._context.restore();this._titleElement.style.top=(boxY+3)+'px';this._titleElement.style.left=(boxX+3)+'px';}
_viewportDimensions(){const gutterSize=30;const bordersSize=Screencast.ScreencastView._bordersSize;const width=this.element.offsetWidth-bordersSize-gutterSize;const height=this.element.offsetHeight-bordersSize-gutterSize-Screencast.ScreencastView._navBarHeight;return{width:width,height:height};}
setInspectMode(mode,config){this._inspectModeConfig=mode!==Protocol.Overlay.InspectMode.None?config:null;return Promise.resolve();}
highlightFrame(frameId){}
_createCheckerboardPattern(context){const pattern=(createElement('canvas'));const size=32;pattern.width=size*2;pattern.height=size*2;const pctx=pattern.getContext('2d');pctx.fillStyle='rgb(195, 195, 195)';pctx.fillRect(0,0,size*2,size*2);pctx.fillStyle='rgb(225, 225, 225)';pctx.fillRect(0,0,size,size);pctx.fillRect(size,size,size,size);return context.createPattern(pattern,'repeat');}
_createNavigationBar(){this._navigationBar=this.element.createChild('div','screencast-navigation');this._navigationBack=this._navigationBar.createChild('button','back');this._navigationBack.disabled=true;this._navigationForward=this._navigationBar.createChild('button','forward');this._navigationForward.disabled=true;this._navigationReload=this._navigationBar.createChild('button','reload');this._navigationUrl=UI.createInput();this._navigationBar.appendChild(this._navigationUrl);this._navigationUrl.type='text';this._navigationProgressBar=new Screencast.ScreencastView.ProgressTracker(this._resourceTreeModel,this._networkManager,this._navigationBar.createChild('div','progress'));if(this._resourceTreeModel){this._navigationBack.addEventListener('click',this._navigateToHistoryEntry.bind(this,-1),false);this._navigationForward.addEventListener('click',this._navigateToHistoryEntry.bind(this,1),false);this._navigationReload.addEventListener('click',this._navigateReload.bind(this),false);this._navigationUrl.addEventListener('keyup',this._navigationUrlKeyUp.bind(this),true);this._requestNavigationHistory();this._resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.MainFrameNavigated,this._requestNavigationHistory,this);this._resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.CachedResourcesLoaded,this._requestNavigationHistory,this);}}
_navigateToHistoryEntry(offset){const newIndex=this._historyIndex+offset;if(newIndex<0||newIndex>=this._historyEntries.length){return;}
this._resourceTreeModel.navigateToHistoryEntry(this._historyEntries[newIndex]);this._requestNavigationHistory();}
_navigateReload(){this._resourceTreeModel.reloadPage();}
_navigationUrlKeyUp(event){if(event.key!=='Enter'){return;}
let url=this._navigationUrl.value;if(!url){return;}
if(!url.match(Screencast.ScreencastView._SchemeRegex)){url='http://'+url;}
this._resourceTreeModel.navigate(url);this._canvasElement.focus();}
async _requestNavigationHistory(){const history=await this._resourceTreeModel.navigationHistory();if(!history){return;}
this._historyIndex=history.currentIndex;this._historyEntries=history.entries;this._navigationBack.disabled=this._historyIndex===0;this._navigationForward.disabled=this._historyIndex===(this._historyEntries.length-1);let url=this._historyEntries[this._historyIndex].url;const match=url.match(Screencast.ScreencastView._HttpRegex);if(match){url=match[1];}
Host.InspectorFrontendHost.inspectedURLChanged(url);this._navigationUrl.value=url;}
_focusNavigationBar(){this._navigationUrl.focus();this._navigationUrl.select();return true;}};Screencast.ScreencastView._bordersSize=44;Screencast.ScreencastView._navBarHeight=29;Screencast.ScreencastView._HttpRegex=/^http:\/\/(.+)/;Screencast.ScreencastView._SchemeRegex=/^(https?|about|chrome):/;Screencast.ScreencastView.ProgressTracker=class{constructor(resourceTreeModel,networkManager,element){this._element=element;if(resourceTreeModel){resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.MainFrameNavigated,this._onMainFrameNavigated,this);resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.Load,this._onLoad,this);}
if(networkManager){networkManager.addEventListener(SDK.NetworkManager.Events.RequestStarted,this._onRequestStarted,this);networkManager.addEventListener(SDK.NetworkManager.Events.RequestFinished,this._onRequestFinished,this);}}
_onMainFrameNavigated(){this._requestIds={};this._startedRequests=0;this._finishedRequests=0;this._maxDisplayedProgress=0;this._updateProgress(0.1);}
_onLoad(){delete this._requestIds;this._updateProgress(1);setTimeout(function(){if(!this._navigationProgressVisible()){this._displayProgress(0);}}.bind(this),500);}
_navigationProgressVisible(){return!!this._requestIds;}
_onRequestStarted(event){if(!this._navigationProgressVisible()){return;}
const request=(event.data);if(request.type===Common.resourceTypes.WebSocket){return;}
this._requestIds[request.requestId()]=request;++this._startedRequests;}
_onRequestFinished(event){if(!this._navigationProgressVisible()){return;}
const request=(event.data);if(!(request.requestId()in this._requestIds)){return;}
++this._finishedRequests;setTimeout(function(){this._updateProgress(this._finishedRequests/this._startedRequests*0.9);}.bind(this),500);}
_updateProgress(progress){if(!this._navigationProgressVisible()){return;}
if(this._maxDisplayedProgress>=progress){return;}
this._maxDisplayedProgress=progress;this._displayProgress(progress);}
_displayProgress(progress){this._element.style.width=(100*progress)+'%';}};;;Root.Runtime.cachedResources["screencast/screencastView.css"]="/*\n * Copyright (C) 2013 Google Inc. All rights reserved.\n *\n * Redistribution and use in source and binary forms, with or without\n * modification, are permitted provided that the following conditions are\n * met:\n *\n *     * Redistributions of source code must retain the above copyright\n * notice, this list of conditions and the following disclaimer.\n *     * Redistributions in binary form must reproduce the above\n * copyright notice, this list of conditions and the following disclaimer\n * in the documentation and/or other materials provided with the\n * distribution.\n *     * Neither the name of Google Inc. nor the names of its\n * contributors may be used to endorse or promote products derived from\n * this software without specific prior written permission.\n *\n * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS\n * \"AS IS\" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT\n * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR\n * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT\n * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,\n * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT\n * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,\n * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY\n * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT\n * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE\n * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.\n */\n\n.screencast {\n    overflow: hidden;\n}\n\n.screencast-navigation {\n    flex-direction: row;\n    display: flex;\n    flex: 24px 0 0;\n    position: relative;\n    padding-left: 1px;\n    border-bottom: 1px solid rgb(64%, 64%, 64%);\n    background-origin: padding-box;\n    background-clip: padding-box;\n}\n\n.screencast-navigation button {\n    border-radius: 2px;\n    background-color: transparent;\n    background-image: -webkit-image-set(\n        url(Images/navigationControls.png) 1x,\n        url(Images/navigationControls_2x.png) 2x);\n    background-clip: content-box;\n    background-origin: content-box;\n    background-repeat: no-repeat;\n    border: 1px solid transparent;\n    height: 23px;\n    padding: 2px;\n    width: 23px;\n}\n\n.screencast-navigation button:hover {\n    border-color: #ccc;\n}\n\n.screencast-navigation button:active {\n    border-color: #aaa;\n}\n\n.screencast-navigation button[disabled] {\n    opacity: 0.5;\n}\n\n.screencast-navigation button.back {\n    background-position-x: -1px;\n}\n\n.screencast-navigation button.forward {\n    background-position-x: -18px;\n}\n\n.screencast-navigation button.reload {\n    background-position-x: -37px;\n}\n\n.screencast-navigation input {\n    -webkit-flex: 1;\n    margin: 2px;\n    max-height: 19px;\n}\n\n.screencast-navigation .progress {\n    background-color: rgb(66, 129, 235);\n    height: 3px;\n    left: 0;\n    position: absolute;\n    top: 100%;  /* Align with the bottom edge of the parent. */\n    width: 0;\n    z-index: 2;  /* Above .screencast-glasspane. */\n}\n\n.screencast-viewport {\n    display: flex;\n    border: 1px solid #999;\n    border-radius: 20px;\n    flex: none;\n    padding: 20px;\n    margin: 10px;\n    background-color: #eee;\n}\n\n.screencast-canvas-container {\n    flex: auto;\n    display: flex;\n    border: 1px solid #999;\n    position: relative;\n    cursor: -webkit-image-set(url(Images/touchCursor.png) 1x, url(Images/touchCursor_2x.png) 2x), default;\n}\n\n.screencast canvas {\n    flex: auto;\n    position: relative;\n}\n\n.screencast-px {\n    color: rgb(128, 128, 128);\n}\n\n.screencast-element-title {\n    position: absolute;\n    z-index: 10;\n}\n\n.screencast-tag-name {\n    /* Keep this in sync with view-source.css (.webkit-html-tag) */\n    color: rgb(136, 18, 128);\n}\n\n.screencast-node-id {\n    /* Keep this in sync with view-source.css (.webkit-html-attribute-value) */\n    color: rgb(26, 26, 166);\n}\n\n.screencast-class-name {\n    /* Keep this in sync with view-source.css (.webkit-html-attribute-name) */\n    color: rgb(153, 69, 0);\n}\n\n.screencast-glasspane {\n    background-color: rgba(255, 255, 255, 0.8);\n    font-size: 30px;\n    z-index: 100;\n    display: flex;\n    justify-content: center;\n    align-items: center;\n}\n\n/*# sourceURL=screencast/screencastView.css */";