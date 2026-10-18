/*
 MOTION FORGE — After Effects host engine
 Native AE operations only. No external plug-ins required.
*/
(function () {
    var HOST_VERSION="2.2.0";
    function esc(s){ return String(s).replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/\r/g," ").replace(/\n/g," "); }
    function num(v,d){ v=Number(v); return isFinite(v)?v:d; }
    function comp(){ return (app.project && app.project.activeItem instanceof CompItem) ? app.project.activeItem : null; }
    function selected(){ var c=comp(); return c && c.selectedLayers.length ? c.selectedLayers[0] : null; }
    function result(ok,msg,data){ return JSON.stringify({ok:!!ok,message:String(msg||""),data:data||{}}); }
    function ease(p){ try { return new KeyframeEase(0,75); } catch(e){ return null; } }
    function applyEase(prop){ easeProp(prop,72); }
        function selectedLayersOrAll(){
        var c=comp(); if(!c) return [];
        return c.selectedLayers.length ? c.selectedLayers : [];
    }
    function isTextLayer(l){ return !!(l && l.property && l.property("ADBE Text Properties")); }
    function textLayers(){ var ls=selectedLayersOrAll(), out=[]; for(var i=0;i<ls.length;i++) if(isTextLayer(ls[i])) out.push(ls[i]); return out; }
    function propDim(prop){ try{ var v=prop.value; return (v instanceof Array)?v.length:1; }catch(e){ return 1; } }
    function posOffset(v,dx,dy){ var a=(v instanceof Array)?v.slice(0):[0,0]; if(a.length<2)a=[a[0]||0,a[1]||0]; a[0]+=dx; a[1]+=dy; return a; }

    function easeProp(prop,influence){
        if(!prop || prop.numKeys<2) return;
        influence=Math.max(1,Math.min(99,num(influence,72)));
        var dim=propDim(prop), ins=[], outs=[];
        for(var d=0;d<dim;d++){ var ke=new KeyframeEase(0,influence); ins.push(ke); outs.push(ke); }
        for(var k=1;k<=prop.numKeys;k++){ try{prop.setTemporalEaseAtKey(k,ins,outs);}catch(e){} }
    }
    function easePropCurve(prop,c1,c2){
        if(!prop || prop.numKeys<2) return;
        c1=c1||[.25,.1]; c2=c2||[.25,1];
        var x1=Math.max(.001,Math.min(.999,num(c1[0],.25))), y1=num(c1[1],.1);
        var x2=Math.max(.001,Math.min(.999,num(c2[0],.25))), y2=num(c2[1],1);
        var dim=propDim(prop);
        for(var k=1;k<prop.numKeys;k++){
            var a=prop.keyValue(k), b=prop.keyValue(k+1);
            var dt=Math.max(.0001,prop.keyTime(k+1)-prop.keyTime(k));
            var av=(a instanceof Array)?a:[a], bv=(b instanceof Array)?b:[b], outs=[], ins=[];
            var outSlope=y1/x1;
            var inSlope=(1-y2)/(1-x2);
            for(var d=0;d<dim;d++){
                var delta=num(bv[d],0)-num(av[d],0), base=delta/dt;
                if(!isFinite(base)) base=0;
                var os=Math.abs(outSlope)<.0001?base:base*outSlope;
                var is=Math.abs(inSlope)<.0001?base:base*inSlope;
                if(!isFinite(os)) os=0; if(!isFinite(is)) is=0;
                outs.push(new KeyframeEase(os,Math.max(1,Math.min(99,x1*100))));
                ins.push(new KeyframeEase(is,Math.max(1,Math.min(99,(1-x2)*100))));
            }
            try{prop.setTemporalEaseAtKey(k,null,outs);}catch(e){}
            try{prop.setTemporalEaseAtKey(k+1,ins,null);}catch(e){}
        }
    }
    function animate(prop,t0,t1,v0,v1,curve){ prop.setValueAtTime(t0,v0); prop.setValueAtTime(t1,v1); easePropCurve(prop,curve[0],curve[1]); }
    function propByNameOrIndex(group,names,index){ if(!group)return null; for(var i=0;i<names.length;i++){try{var p=group.property(names[i]);if(p)return p;}catch(e){}} try{return index?group.property(index):null;}catch(e){return null;} }
    function safeKey(p,t,v){try{if(p){p.setValueAtTime(t,v);return true;}}catch(e){}return false;}
    function applyCurveToProps(props,c1,c2){for(var i=0;i<props.length;i++)if(props[i]&&props[i].numKeys>1)easePropCurve(props[i],c1,c2);}
    function appleGlass(){
        var c=comp(),layers=selectedLayersOrAll();if(!c||!layers.length)return result(false,"Select one or more layers.");
        app.beginUndoGroup("Motion Forge — Glass");
        try{var n=0,t=c.time,d=Math.max(c.frameDuration*14,.5);for(var i=0;i<layers.length;i++){var l=layers[i],fx=l.property("ADBE Effect Parade");
            try{var bl=fx.addProperty("ADBE Gaussian Blur 2");bl.name="MF • Glass Blur";var bp=propByNameOrIndex(bl,["ADBE Gaussian Blur 2"],1);safeKey(bp,t,14);safeKey(bp,t+d,3);applyCurveToProps([bp],[.2,0],[.18,1]);}catch(e){}
            try{var tint=fx.addProperty("ADBE Tint");tint.name="MF • Glass Tint";}catch(e){}
            var o=l.transform.opacity,sc=l.transform.scale,sv=sc.value;safeKey(o,t,0);safeKey(o,t+d*.35,92);safeKey(o,t+d,100);safeKey(sc,t,[sv[0]*.97,sv[1]*.97]);safeKey(sc,t+d,sv);applyCurveToProps([o,sc],[.18,0],[.16,1]);n++;}
            return result(true,"Native glass treatment applied to "+n+" layer(s).");}catch(e){return result(false,"Glass failed safely: "+e.toString());}finally{app.endUndoGroup();}
    }
    function appleMotion(kind){
        var c=comp(),layers=selectedLayersOrAll();if(!c||!layers.length)return result(false,"Select one or more layers.");
        var cfg={standard:[.94,1,24,0,[.22,.08],[.20,1],.46],smooth:[.97,1,18,0,[.25,.05],[.25,1],.62],emphasized:[.86,1,44,0,[.16,0],[.12,1],.42],soft:[.98,1,12,0,[.32,.04],[.20,1],.78],snap:[.90,1.015,18,0,[.08,.02],[.14,1],.32],bouncy:[.82,1,16,0,[.12,0],[.18,1],.58],anticipate:[.94,1,12,-7,[.32,-.18],[.16,1],.56],spring:[.78,1,20,0,[.11,0],[.19,1],.72],settle:[.92,1,0,0,[.18,0],[.24,1],.64],overshoot:[.88,1.04,8,0,[.13,0],[.18,1],.56],"float":[.96,1,34,0,[.28,.05],[.25,1],.9],lift:[.95,1,52,0,[.20,0],[.18,1],.48],drift:[.99,1,10,2,[.4,.05],[.25,1],1.05],punch:[.82,1.02,0,0,[.09,0],[.17,1],.38],reveal:[.93,1,30,0,[.18,0],[.14,1],.5]};
        var cc=cfg[kind]||cfg.standard;app.beginUndoGroup("Motion Forge — "+kind);
        try{var t=c.time,d=Math.max(c.frameDuration*8,cc[6]),n=0;for(var i=0;i<layers.length;i++){var l=layers[i],p=l.transform.position,s=l.transform.scale,o=l.transform.opacity,r=l.transform.rotation,pv=p.value,sv=s.value,rv=r.value;safeKey(o,t,0);safeKey(o,t+d*.55,100);if(cc[2]){safeKey(p,t,posOffset(pv,0,cc[2]));safeKey(p,t+d,pv);}if(cc[0]!==1||cc[1]!==1){safeKey(s,t,[sv[0]*cc[0],sv[1]*cc[0]]);safeKey(s,t+d*.72,[sv[0]*cc[1],sv[1]*cc[1]]);safeKey(s,t+d,sv);}if(cc[3]){safeKey(r,t,rv+cc[3]);safeKey(r,t+d,rv);}applyCurveToProps([o,p,s,r],cc[4],cc[5]);n++;}return result(true,kind+" motion applied to "+n+" layer(s).",{duration:d});}catch(e){return result(false,kind+" failed safely: "+e.toString());}finally{app.endUndoGroup();}
    }
    function addText(text){
        var c=comp(); if(!c) return result(false,"Open a composition first.");
        app.beginUndoGroup("Motion Forge — Add Text");
        try{
            var l=c.layers.addText(text||"Motion Forge");
            var r=l.property("ADBE Text Properties").property("ADBE Text Document");
            var d=r.value; d.fontSize=Math.max(18,Math.min(160,c.height*0.09)); d.fillColor=[1,1,1]; d.applyFill=true;
            r.setValue(d);
            l.transform.position.setValue([c.width/2,c.height/2]);
            l.name="MF • "+(text||"Text");
            return result(true,"Text layer created.",{layer:l.name});
        }catch(e){return result(false,e.toString());}finally{app.endUndoGroup();}
    }

    // Text composer: lets the panel pass a JSON payload of {text, is3D} so the user can
    // type exactly what the layer should say and choose whether it should be a 3D layer.
    function addTextAdvanced(payload){
        var c=comp(); if(!c) return result(false,"Open a composition first.");
        var opts={};
        try{ opts=JSON.parse(payload||"{}"); }catch(e){ opts={}; }
        var txt = (opts.text!==undefined && opts.text!==null && String(opts.text).length) ? String(opts.text) : "Motion Forge";
        var make3D = !!opts.is3D;
        app.beginUndoGroup("Motion Forge — Add Text");
        try{
            var l=c.layers.addText(txt);
            var r=l.property("ADBE Text Properties").property("ADBE Text Document");
            var d=r.value; d.fontSize=Math.max(18,Math.min(160,c.height*0.09)); d.fillColor=[1,1,1]; d.applyFill=true;
            r.setValue(d);
            l.transform.position.setValue([c.width/2,c.height/2]);
            l.name="MF • "+txt;
            var note="";
            if(make3D){
                l.threeDLayer=true;
                var extruded=false;
                try{
                    // Extrusion only renders with the Cinema 4D renderer. Switching to it is safe:
                    // if the renderer name isn't available on this AE version/host it fails quietly.
                    c.renderer="CINEMA4D_RENDERER";
                    var grp=l.property("ADBE Extrsn Bvl Mtrl Grp");
                    if(grp){
                        var depth=grp.property("ADBE Extrsn Depth");
                        if(depth){ depth.setValue(40); extruded=true; }
                    }
                }catch(e){}
                note = extruded
                    ? " 3D extrusion enabled (Cinema 4D renderer)."
                    : " Layer set to 3D space. (Real extrusion needs the Cinema 4D renderer, which isn't available/active on this AE install — the layer still moves and rotates in 3D.)";
            }
            return result(true,"Text layer created."+note,{layer:l.name,threeD:make3D,extruded:extruded===true});
        }catch(e){return result(false,e.toString());}finally{app.endUndoGroup();}
    }
    function fadeUp(){
        var c=comp(), layers=selectedLayersOrAll(); if(!c||!layers.length)return result(false,"Select a layer.");
        app.beginUndoGroup("Motion Forge — Fade Up");
        try{for(var j=0;j<layers.length;j++){var l=layers[j], p=l.opacity, pos=l.transform.position, t=c.time, dur=Math.max(c.frameDuration*8,0.35), y=pos.value[1];
            p.setValueAtTime(t,0);p.setValueAtTime(t+dur,100);
            pos.setValueAtTime(t,posOffset(pos.value,0,60));pos.setValueAtTime(t+dur,[pos.value[0],y]);easePropCurve(p,[.22,.05],[.18,1]);easePropCurve(pos,[.18,0],[.16,1]);
        }return result(true,"Fade Up applied to "+layers.length+" layer(s).");}catch(e){return result(false,e.toString());}finally{app.endUndoGroup();}
    }
    function pop(){
        var c=comp(), layers=selectedLayersOrAll(); if(!c||!layers.length)return result(false,"Select a layer.");
        app.beginUndoGroup("Motion Forge — Pop");
        try{for(var j=0;j<layers.length;j++){var s=layers[j].transform.scale,t=c.time,d=Math.max(c.frameDuration*10,0.4),v=s.value;
            s.setValueAtTime(t,[v[0]*78/100,v[1]*78/100]);s.setValueAtTime(t+d*.62,v);s.setValueAtTime(t+d,[v[0]*103/100,v[1]*103/100]);s.setValueAtTime(t+d*1.12,v);easePropCurve(s,[.12,0],[.18,1]);
        }return result(true,"Pop applied.");}catch(e){return result(false,e.toString());}finally{app.endUndoGroup();}
    }
    function slide(dir){
        var c=comp(), layers=selectedLayersOrAll(); if(!c||!layers.length)return result(false,"Select a layer.");
        app.beginUndoGroup("Motion Forge — Slide");
        try{for(var j=0;j<layers.length;j++){var p=layers[j].transform.position,t=c.time,d=Math.max(c.frameDuration*10,.45),v=p.value,x=v[0],y=v[1],off=Math.max(120,c.width*.16)*dir;
            p.setValueAtTime(t,posOffset(p.value,off,0));p.setValueAtTime(t+d,v);easePropCurve(p,[.2,.0],[.16,1]);
        }return result(true,"Slide "+(dir<0?"Left":"Right")+" applied.");}catch(e){return result(false,e.toString());}finally{app.endUndoGroup();}
    }
    function zoom(){
        var c=comp(), layers=selectedLayersOrAll(); if(!c||!layers.length)return result(false,"Select a layer.");
        app.beginUndoGroup("Motion Forge — Zoom");
        try{for(var j=0;j<layers.length;j++){var p=layers[j].transform.scale,t=c.time,d=Math.max(c.frameDuration*10,.5),v=p.value;
            p.setValueAtTime(t,[v[0]*82/100,v[1]*82/100]);p.setValueAtTime(t+d,v);easePropCurve(p,[.16,0],[.14,1]);
        }return result(true,"Zoom In applied.");}catch(e){return result(false,e.toString());}finally{app.endUndoGroup();}
    }
    function rotate(){
        var c=comp(), layers=selectedLayersOrAll(); if(!c||!layers.length)return result(false,"Select a layer.");
        app.beginUndoGroup("Motion Forge — Rotate");
        try{for(var j=0;j<layers.length;j++){var p=layers[j].transform.rotation,t=c.time,d=Math.max(c.frameDuration*12,.55),v=p.value;
            p.setValueAtTime(t,v-18);p.setValueAtTime(t+d,v);easePropCurve(p,[.2,0],[.16,1]);
        }return result(true,"Rotate In applied.");}catch(e){return result(false,e.toString());}finally{app.endUndoGroup();}
    }
    function blurReveal(){
        var c=comp(), layers=selectedLayersOrAll(); if(!c||!layers.length)return result(false,"Select a layer.");
        app.beginUndoGroup("Motion Forge — Blur Reveal");
        try{for(var j=0;j<layers.length;j++){var l=layers[j],t=c.time,d=Math.max(c.frameDuration*10,.5);
            var fx=l.property("ADBE Effect Parade").addProperty("ADBE Gaussian Blur 2"); fx.name="MF • Blur Reveal";
            var b=fx.property("ADBE Gaussian Blur 2-0001"); b.setValueAtTime(t,35);b.setValueAtTime(t+d,0);easePropCurve(b,[.22,0],[.18,1]);
            var o=l.transform.opacity;o.setValueAtTime(t,0);o.setValueAtTime(t+d,100);easePropCurve(o,[.2,0],[.18,1]);
        }return result(true,"Blur Reveal applied.");}catch(e){return result(false,e.toString());}finally{app.endUndoGroup();}
    }
    function shake(){
        var layers=selectedLayersOrAll(); if(!layers.length)return result(false,"Select a layer.");
        app.beginUndoGroup("Motion Forge — Shake");
        try{for(var j=0;j<layers.length;j++){var p=layers[j].transform.position;
            p.expression='freq=9; amp=12; wiggle(freq,amp);';}
        return result(true,"Native wiggle expression applied.");}catch(e){return result(false,e.toString());}finally{app.endUndoGroup();}
    }
    function easeSelected(){
        var layers=selectedLayersOrAll(); if(!layers.length)return result(false,"Select a layer.");
        app.beginUndoGroup("Motion Forge — Ease");
        try{for(var j=0;j<layers.length;j++){var l=layers[j]; for(var k=1;k<=l.property("ADBE Transform Group").numProperties;k++){var p=l.property("ADBE Transform Group").property(k);if(p&&p.numKeys>1)applyEase(p);}}
        return result(true,"Keyframes eased on selected layer(s).");}catch(e){return result(false,e.toString());}finally{app.endUndoGroup();}
    }
    function addSolid(){
        var c=comp();if(!c)return result(false,"Open a composition first.");app.beginUndoGroup("Motion Forge — Solid");
        try{var l=c.layers.addSolid([0.08,0.08,0.1],"MF • Solid",c.width,c.height,c.pixelAspect);l.selected=true;return result(true,"Solid created.");}catch(e){return result(false,e.toString());}finally{app.endUndoGroup();}
    }
    function addAdjustment(){
        var c=comp();if(!c)return result(false,"Open a composition first.");app.beginUndoGroup("Motion Forge — Adjustment");
        try{var l=c.layers.addSolid([1,1,1],"MF • Adjustment",c.width,c.height,c.pixelAspect);l.adjustmentLayer=true;return result(true,"Adjustment layer created.");}catch(e){return result(false,e.toString());}finally{app.endUndoGroup();}
    }
    function duplicate(){var layers=selectedLayersOrAll();if(!layers.length)return result(false,"Select a layer.");app.beginUndoGroup("Motion Forge — Duplicate");try{for(var i=0;i<layers.length;i++)layers[i].duplicate();return result(true,"Layer duplicated.");}catch(e){return result(false,e.toString());}finally{app.endUndoGroup();}}
    function precomp(){
        var c=comp();if(!c||!c.selectedLayers.length)return result(false,"Select one or more layers.");
        app.beginUndoGroup("Motion Forge — Pre-compose");try{var ids=[];for(var i=0;i<c.selectedLayers.length;i++)ids.push(c.selectedLayers[i].index);c.layers.precompose(ids,"MF • Precomp",true);return result(true,"Layers pre-composed.");}catch(e){return result(false,e.toString());}finally{app.endUndoGroup();}
    }

    // Single source of truth: every effect this panel can apply, native and third-party.
    // addEffect() and the install-check both read from this one table, so they can never drift apart.
    var MF_FX={
        // Blur & Sharpen
        blur:{mn:"ADBE Gaussian Blur 2",n:"Gaussian Blur"},
        boxblur:{mn:"ADBE Box Blur2",n:"Box Blur"},
        lensblur:{mn:"ADBE Camera Lens Blur",n:"Camera Lens Blur"},
        dirblur:{mn:"ADBE Directional Blur",n:"Directional Blur"},
        radialblur:{mn:"ADBE Radial Blur",n:"Radial Blur"},
        sharpen:{mn:"ADBE Sharpen",n:"Sharpen"},
        unsharp:{mn:"ADBE Unsharp Mask2",n:"Unsharp Mask"},
        vecblur:{mn:"CC Vector Blur",n:"CC Vector Blur"},
        // Color Correction
        levels:{mn:"ADBE Easy Levels2",n:"Levels"},
        curves:{mn:"ADBE CurvesCustom",n:"Curves"},
        colorbalance:{mn:"ADBE Color Balance 2",n:"Color Balance"},
        colorbalancehls:{mn:"ADBE Color Balance (HLS)",n:"Color Balance (HLS)"},
        huesat:{mn:"ADBE HUE SATURATION",n:"Hue / Saturation"},
        vibrance:{mn:"ADBE Vibrance",n:"Vibrance"},
        bw:{mn:"ADBE Black&White",n:"Black & White"},
        photofilter:{mn:"ADBE Photo Filter",n:"Photo Filter"},
        tint:{mn:"ADBE Tint",n:"Tint"},
        fill:{mn:"ADBE Fill",n:"Fill"},
        tritone:{mn:"ADBE Tritone",n:"Tritone"},
        exposure:{mn:"ADBE Exposure2",n:"Exposure"},
        bc:{mn:"ADBE Brightness & Contrast 2",n:"Brightness / Contrast"},
        changecolor:{mn:"ADBE Change Color",n:"Change Color"},
        changetocolor:{mn:"ADBE Change to Color",n:"Change to Color"},
        shadowhighlight:{mn:"ADBE Shadow/Highlight",n:"Shadow / Highlight"},
        lumetri:{mn:"ADBE Lumetri",n:"Lumetri Color"},
        // Stylize
        glow:{mn:"ADBE Glo2",n:"Glow"},
        mosaic:{mn:"ADBE Mosaic",n:"Mosaic"},
        findedges:{mn:"ADBE Find Edges",n:"Find Edges"},
        posterize:{mn:"ADBE Posterize",n:"Posterize"},
        noise:{mn:"ADBE Noise",n:"Noise"},
        scatter:{mn:"ADBE Scatterize",n:"Scatter"},
        threshold:{mn:"ADBE Threshold2",n:"Threshold"},
        coloremboss:{mn:"ADBE Color Emboss",n:"Color Emboss"},
        emboss:{mn:"ADBE Emboss",n:"Emboss"},
        strobe:{mn:"ADBE Strobe Light",n:"Strobe Light"},
        ccglass:{mn:"CC Glass",n:"CC Glass"},
        // Distort
        wavewarp:{mn:"ADBE Wave Warp",n:"Wave Warp"},
        turbulence:{mn:"ADBE Turbulent Displace",n:"Turbulent Displace"},
        displace:{mn:"ADBE Displacement Map",n:"Displacement Map"},
        bulge:{mn:"ADBE Bulge",n:"Bulge"},
        spherize:{mn:"ADBE Spherize",n:"Spherize"},
        cornerpin:{mn:"ADBE Corner Pin",n:"Corner Pin"},
        meshwarp:{mn:"ADBE Mesh Warp",n:"Mesh Warp"},
        liquify:{mn:"ADBE Liquify",n:"Liquify"},
        opticscomp:{mn:"ADBE Optics Compensation",n:"Optics Compensation"},
        bendit:{mn:"CC Bend It",n:"CC Bend It"},
        ripplepulse:{mn:"CC Ripple Pulse",n:"CC Ripple Pulse"},
        // Generate
        ramp:{mn:"ADBE Ramp",n:"Gradient Ramp"},
        checkerboard:{mn:"ADBE Checkerboard",n:"Checkerboard"},
        fractalnoise:{mn:"ADBE Fractal Noise",n:"Fractal Noise"},
        grid:{mn:"ADBE Grid",n:"Grid"},
        lensflare:{mn:"ADBE Lens Flare",n:"Lens Flare (native)"},
        radiowaves:{mn:"ADBE Radio Waves",n:"Radio Waves"},
        vegas:{mn:"ADBE Vegas",n:"Vegas"},
        writeon:{mn:"ADBE Write-on",n:"Write-on"},
        circle:{mn:"ADBE Circle",n:"Circle"},
        // Perspective
        bevelalpha:{mn:"ADBE Bevel Alpha",n:"Bevel Alpha"},
        beveledges:{mn:"ADBE Bevel Edges",n:"Bevel Edges"},
        dropshadow:{mn:"ADBE Drop Shadow",n:"Drop Shadow"},
        radialshadow:{mn:"ADBE Radial Shadow",n:"Radial Shadow"},
        glasses3d:{mn:"ADBE 3D Glasses",n:"3D Glasses"},
        // Time
        echo:{mn:"ADBE Echo",n:"Echo"},
        posterizetime:{mn:"ADBE Posterize Time",n:"Posterize Time"},
        timewarp:{mn:"ADBE Timewarp",n:"Timewarp"},
        ccmotion:{mn:"CC Force Motion Blur",n:"CC Force Motion Blur"},
        // Transition
        linearwipe:{mn:"ADBE Linear Wipe",n:"Linear Wipe"},
        radialwipe:{mn:"ADBE Radial Wipe",n:"Radial Wipe"},
        venetian:{mn:"ADBE Venetian Blinds",n:"Venetian Blinds"},
        blockdissolve:{mn:"ADBE Block Dissolve",n:"Block Dissolve"},
        cardwipe:{mn:"ADBE Card Wipe",n:"Card Wipe"},
        gradientwipe:{mn:"ADBE Gradient Wipe",n:"Gradient Wipe"},
        iriswipe:{mn:"ADBE IRIS WIPE",n:"Iris Wipe"},
        // Channel
        setmatte:{mn:"ADBE Set Matte3",n:"Set Matte"},
        shiftchannels:{mn:"ADBE Shift Channels",n:"Shift Channels"},
        invert:{mn:"ADBE Invert",n:"Invert"},
        minimax:{mn:"ADBE Minimax",n:"Minimax"},
        // Third-party — only ever shown in the panel if actually detected installed
        twixtor:{mn:"Twixtor",n:"Twixtor",tp:"RE:Vision Effects"},
        particular:{mn:"Particular",n:"Trapcode Particular",tp:"Red Giant / Trapcode"},
        form:{mn:"Form",n:"Trapcode Form",tp:"Red Giant / Trapcode"},
        shine:{mn:"Shine",n:"Trapcode Shine",tp:"Red Giant / Trapcode"},
        starglow:{mn:"Starglow",n:"Trapcode Starglow",tp:"Red Giant / Trapcode"},
        stroke3d:{mn:"3D Stroke",n:"Trapcode 3D Stroke",tp:"Red Giant / Trapcode"},
        soundkeys:{mn:"Sound Keys",n:"Trapcode Sound Keys",tp:"Red Giant / Trapcode"},
        opticalflares:{mn:"Optical Flares",n:"Optical Flares",tp:"Video Copilot"},
        saber:{mn:"Saber",n:"Saber",tp:"Video Copilot"},
        magicbulletlooks:{mn:"Magic Bullet Looks",n:"Magic Bullet Looks",tp:"Red Giant"}
    };
    function fxApply(id){
        var def=MF_FX[id]; if(!def) return result(false,"Unknown effect: "+id);
        return addEffect(def.mn,def.n);
    }
    function fxCheckAll(){
        var proj=app.project, testComp=null, testLayer=null, made=false, avail={};
        app.beginUndoGroup("Motion Forge — Check Effects");
        try{
            testComp=proj.items.addComp("__mf_probe__",64,64,1,1,30); made=true;
            testLayer=testComp.layers.addSolid([0,0,0],"__mf_probe_solid__",64,64,1);
            var fx=testLayer.property("ADBE Effect Parade");
            for(var id in MF_FX){
                if(!MF_FX.hasOwnProperty(id)) continue;
                var mn=MF_FX[id].mn;
                try{ var p=fx.addProperty(mn); avail[id]=!!p; if(p)p.remove(); }
                catch(e){ avail[id]=false; }
            }
        }catch(e){}
        finally{ try{ if(made&&testComp) testComp.remove(); }catch(e){} app.endUndoGroup(); }
        return result(true,"Checked effects against this After Effects install.",{available:avail,ae:app.version});
    }
    function addEffect(matchName,label){
        var layers=selectedLayersOrAll(); if(!layers.length)return result(false,"Select a layer.");
        app.beginUndoGroup("Motion Forge — "+label);
        try{
            var added=0;
            for(var i=0;i<layers.length;i++){
                try{var fx=layers[i].property("ADBE Effect Parade").addProperty(matchName);if(fx){fx.name="MF • "+label;added++;}}catch(e){}
            }
            return result(added>0, added>0 ? (label+" added to "+added+" layer(s).") : (label+" isn't available in this After Effects version/install."), {added:added});
        }catch(e){return result(false,e.toString());}finally{app.endUndoGroup();}
    }
    function removeMFEffects(){
        var layers=selectedLayersOrAll(); if(!layers.length)return result(false,"Select a layer.");
        app.beginUndoGroup("Motion Forge — Remove Effects");
        try{var n=0;for(var i=0;i<layers.length;i++){var fx=layers[i].property("ADBE Effect Parade");for(var k=fx.numProperties;k>=1;k--){if(String(fx.property(k).name).indexOf("MF •")===0){fx.property(k).remove();n++;}}}return result(true,"Removed "+n+" Motion Forge effect(s).");}catch(e){return result(false,e.toString());}finally{app.endUndoGroup();}
    }

    function graphEase(x1,y1,x2,y2){
        var c=comp(); var layers=selectedLayersOrAll(); if(!layers.length)return result(false,"Select one or more layers first.");
        x1=num(x1,.25);y1=num(y1,.1);x2=num(x2,.25);y2=num(y2,1); x1=Math.max(.001,Math.min(.999,x1));x2=Math.max(.001,Math.min(.999,x2));
        app.beginUndoGroup("Motion Forge — Graph Ease");
        try{
            var changed=0, created=0;
            for(var li=0;li<layers.length;li++){
                var tg=layers[li].property("ADBE Transform Group"), hadKeys=false;
                for(var k=1;k<=tg.numProperties;k++){ var prop=tg.property(k); if(prop&&prop.numKeys>1){ easePropCurve(prop,[x1,y1],[x2,y2]); changed++; hadKeys=true; } }
                if(!hadKeys && c){
                    // No existing animation to ease — rather than silently doing nothing,
                    // create a simple opacity fade-in and ease that, so this always does something visible.
                    var op=tg.property("ADBE Opacity"), t0=c.time, t1=c.time+Math.max(c.frameDuration*12,.4);
                    try{ op.setValueAtTime(t0,0); op.setValueAtTime(t1,100); easePropCurve(op,[x1,y1],[x2,y2]); created++; changed++; }catch(e){}
                }
            }
            var msg = created>0
                ? ("No existing keyframes were found, so a fade-in was created and eased on "+created+" layer(s). Animate Position/Scale/Rotation yourself first if you want this curve applied to that instead.")
                : ("Graph easing applied to "+changed+" animated transform properties.");
            return result(changed>0,msg,{curve:[x1,y1,x2,y2],created:created});
        }catch(e){return result(false,e.toString());}finally{app.endUndoGroup();}
    }

    function textAnimatorBase(l,name){
        if(!isTextLayer(l)) return null;
        var tp=l.property("ADBE Text Properties"), anim=tp.addProperty("ADBE Text Animator");
        anim.name="MF • "+name;
        var props=anim.property("ADBE Text Animator Properties"), sel=anim.property("ADBE Text Selectors").property(1);
        return {anim:anim,props:props,sel:sel,start:sel.property("ADBE Text Percent Start"),end:sel.property("ADBE Text Percent End")};
    }
    function textReveal(kind){
        var c=comp(),layers=textLayers(); if(!c||!layers.length)return result(false,"Select one or more text layers.");
        app.beginUndoGroup("Motion Forge — Text "+kind);
        try{
            var t=c.time, d=Math.max(c.frameDuration*16,.55);
            var cfg={
                "Type On":{curve:[[.2,.02],[.15,1]],y:0,scale:.96,rot:0,track:0,character:true},
                "Fade + Rise":{curve:[[.16,0],[.18,1]],y:45,scale:1,rot:0,track:0},
                "Tracking Reveal":{curve:[[.42,0],[.92,.8]],y:0,scale:1,rot:0,track:55,character:true},
                "Text Wipe":{curve:[[.58,0],[.92,.72]],y:0,scale:1,rot:0,track:0,character:true},
                "Spring Reveal":{curve:[[.18,1.08],[.32,.94]],y:24,scale:.82,rot:0,track:0},
                "Magnetic Reveal":{curve:[[.3,.02],[.14,1.05]],y:30,scale:.94,rot:0,track:42,character:true}
            };
            var cc=cfg[kind]||cfg["Fade + Rise"];
            for(var i=0;i<layers.length;i++){
                var l=layers[i],op=l.transform.opacity,pos=l.transform.position,sc=l.transform.scale,rot=l.transform.rotation;
                var pv=pos.value,sv=sc.value,rv=rot.value;
                op.setValueAtTime(t,0); op.setValueAtTime(t+d,100); easePropCurve(op,cc.curve[0],cc.curve[1]);
                if(cc.y){pos.setValueAtTime(t,posOffset(pv,0,cc.y));pos.setValueAtTime(t+d,pv);easePropCurve(pos,cc.curve[0],cc.curve[1]);}
                if(cc.scale!==1){sc.setValueAtTime(t,[sv[0]*cc.scale,sv[1]*cc.scale]);sc.setValueAtTime(t+d,sv);easePropCurve(sc,cc.curve[0],cc.curve[1]);}
                if(cc.rot){rot.setValueAtTime(t,rv+cc.rot);rot.setValueAtTime(t+d,rv);easePropCurve(rot,cc.curve[0],cc.curve[1]);}
                if(cc.character){
                    var a=textAnimatorBase(l,kind), sel=a.end;
                    if(a.props.property("ADBE Text Opacity")) a.props.property("ADBE Text Opacity").setValue(-100);
                    if(cc.track){var tr=a.props.addProperty("ADBE Text Tracking Amount");tr.setValueAtTime(t,cc.track);tr.setValueAtTime(t+d,0);easePropCurve(tr,cc.curve[0],cc.curve[1]);}
                    try{sel.property("ADBE Text Percent Start").setValue(0);}catch(e){}
                    sel.property("ADBE Text Percent End").setValueAtTime(t,0);
                    sel.property("ADBE Text Percent End").setValueAtTime(t+d,100);
                    easePropCurve(sel.property("ADBE Text Percent End"),cc.curve[0],cc.curve[1]);
                }
            }
            return result(true,kind+" applied with animation-specific graph easing.",{layers:layers.length,duration:d});
        }catch(e){return result(false,"Text animation failed safely: "+e.toString());}finally{app.endUndoGroup();}
    }
    function textType(){ return textReveal("Type On"); }
    function textFadeOut(){
        var c=comp(),layers=textLayers();if(!c||!layers.length)return result(false,"Select one or more text layers.");
        app.beginUndoGroup("Motion Forge — Text Fade Out");
        try{var t=c.time,d=Math.max(c.frameDuration*14,.5),n=0;for(var i=0;i<layers.length;i++){var op=layers[i].transform.opacity;op.setValueAtTime(t,100);op.setValueAtTime(t+d,0);easePropCurve(op,[.18,0],[.7,1]);n++;}return result(true,"Text Fade Out applied.",{layers:n});}catch(e){return result(false,e.toString());}finally{app.endUndoGroup();}
    }
    function textTracking(){ return textReveal("Tracking Reveal"); }
    function textWipe(){ return textReveal("Text Wipe"); }
    function textMagnetic(){ return textReveal("Magnetic Reveal"); }
    function bounce(){ return textReveal("Spring Reveal"); }

    function transitionPush(){return slide(-1);}
    function transitionScale(){return zoom();}
    function addMask(kind){
        var c=comp(),layers=selectedLayersOrAll();if(!c||!layers.length)return result(false,"Select one or more layers.");app.beginUndoGroup("Motion Forge — Mask");
        try{
            for(var i=0;i<layers.length;i++){
                var l=layers[i],m=l.Masks.addProperty("ADBE Mask Atom"),sh=m.property("ADBE Mask Shape"),s=sh.value;
                var r=l.sourceRectAtTime(c.time,false),cx=r.left+r.width/2,cy=r.top+r.height/2,w=Math.max(20,r.width*.5),h=Math.max(20,r.height*.5);
                if(kind==="ellipse"){
                    var pts=[],rx=w,ry=h;
                    for(var j=0;j<48;j++){var a=j*2*Math.PI/48;pts.push([cx+Math.cos(a)*rx,cy+Math.sin(a)*ry]);}
                    s.vertices=pts;
                    var ins=[],outs=[]; for(var q=0;q<pts.length;q++){ins.push([0,0]);outs.push([0,0]);}
                    s.inTangents=ins;s.outTangents=outs;
                } else {
                    s.vertices=[[cx-w,cy-h],[cx+w,cy-h],[cx+w,cy+h],[cx-w,cy+h]];
                    s.inTangents=[[0,0],[0,0],[0,0],[0,0]];s.outTangents=[[0,0],[0,0],[0,0],[0,0]];
                }
                s.closed=true;sh.setValue(s);m.name="MF • "+(kind==="ellipse"?"Ellipse Mask":"Rectangle Mask");m.maskMode=MaskMode.ADD;
            }
            return result(true,(kind==="ellipse"?"Ellipse":"Rectangle")+" mask(s) created.");
        }catch(e){return result(false,"Mask creation failed safely: "+e.toString());}finally{app.endUndoGroup();}
    }
    function camera(mode){
        var c=comp();if(!c)return result(false,"Open a composition first.");app.beginUndoGroup("Motion Forge — Camera");
        try{var cam=null;for(var i=1;i<=c.numLayers;i++){if(c.layer(i).matchName==="ADBE Camera Layer"){cam=c.layer(i);break;}}if(!cam)cam=c.layers.addCamera("MF • Camera",[c.width/2,c.height/2]);cam.autoOrient=AutoOrientType.NO_AUTO_ORIENT;
            var p=cam.transform.position,o=cam.transform.orientation,t=c.time,d=Math.max(.8,c.frameDuration*24),v=p.value;
            if(mode==="wiggle"){p.expression="freq=4; amp=10; seedRandom(index,true); wiggle(freq,amp);";o.expression="freq=3; amp=1.8; wiggle(freq,amp);";}
            else if(mode==="drift"){p.expression="value + [Math.sin(time*0.7)*18, Math.cos(time*0.55)*10, Math.sin(time*0.35)*12];";}
            else if(mode==="orbit"){
                try{p.expression="var r=420; var spd=0.35; var a=time*spd; var cx="+(c.width/2)+"; var cy="+(c.height/2)+"; [cx+Math.cos(a)*r,cy+Math.sin(a)*r,-700+Math.sin(a*.5)*80];";o.expression="lookAt(position,["+(c.width/2)+","+(c.height/2)+",0]);";}catch(e){p.setValueAtTime(t,[c.width/2+420,c.height/2,-700]);p.setValueAtTime(t+d,[c.width/2,c.height/2+420,-700]);easePropCurve(p,[.2,0],[.16,1]);}
            }
            else {p.setValueAtTime(t,[v[0],v[1],v[2]+180]);p.setValueAtTime(t+d,v);easePropCurve(p,[.2,0],[.16,1]);}
            cam.selected=true;return result(true,"Camera "+mode+" applied.",{camera:cam.name});
        }catch(e){return result(false,e.toString());}finally{app.endUndoGroup();}
    }
    function stagger(){
        var c=comp();if(!c||c.selectedLayers.length<2)return result(false,"Select two or more layers.");app.beginUndoGroup("Motion Forge — Stagger");
        try{var ls=c.selectedLayers,step=Math.max(c.frameDuration*3,.06);for(var i=0;i<ls.length;i++){ls[i].startTime+=i*step;}return result(true,"Layers staggered by "+step.toFixed(3)+"s.");}catch(e){return result(false,e.toString());}finally{app.endUndoGroup();}
    }


    function applyFont(name){
        var layers=textLayers(); if(!layers.length)return result(false,"Select one or more text layers.");
        app.beginUndoGroup("Motion Forge — Apply Font");
        try{var target=String(name),resolved=target,fonts=[];try{if(app.fonts&&app.fonts.allFonts){for(var fi=0;fi<app.fonts.allFonts.length;fi++){var fam=app.fonts.allFonts[fi];for(var sj=0;sj<fam.length;sj++){var f=fam[sj];fonts.push(f);if(String(f.postScriptName).toLowerCase()===target.toLowerCase()||String(f.family).toLowerCase()===target.toLowerCase()||String(f.fullName).toLowerCase()===target.toLowerCase())resolved=f.postScriptName;}}}}catch(e){}
            var n=0;for(var i=0;i<layers.length;i++){var td=layers[i].property("ADBE Text Properties").property("ADBE Text Document"),d=td.value;d.font=resolved;td.setValue(d);n++;}return result(true,n+" text layer(s) updated to "+resolved+".");}
        catch(e){return result(false,"Could not apply font. Search for the exact installed font name, then apply it: "+e.toString());}finally{app.endUndoGroup();}
    }

    function glassText3D(){
        var c=comp(); if(!c)return result(false,"Open a composition first.");
        var layers=selectedLayersOrAll(); if(!layers.length)return result(false,"Select one or more text layers.");
        app.beginUndoGroup("Motion Forge — Apple Glass Text");
        try{
            var c4d=false;
            try{ c.renderer="CINEMA4D_RENDERER"; c4d=(c.renderer==="CINEMA4D_RENDERER"); }catch(e){}
            // Make sure there's a light in the comp so specular highlights actually show.
            var hasLight=false;
            for(var li=1;li<=c.numLayers;li++){ try{ if(c.layer(li) instanceof LightLayer){ hasLight=true; break; } }catch(e){} }
            if(!hasLight){
                try{
                    var lgt=c.layers.addLight("MF • Glass Key Light",[c.width*0.3,c.height*0.2]);
                    lgt.lightType=LightType.SPOT;
                    try{ lgt.property("ADBE Light Options Group").property("ADBE Light Intensity").setValue(135); }catch(e){}
                    try{ lgt.property("ADBE Light Options Group").property("ADBE Light Color").setValue([1,1,1]); }catch(e){}
                    var lp=lgt.property("ADBE Transform Group").property("ADBE Position"); if(lp) lp.setValue([c.width*0.3,c.height*0.15,-600]);
                }catch(e){}
            }
            var done=0, extruded=0;
            for(var i=0;i<layers.length;i++){
                var l=layers[i];
                try{
                    if(!l.threeDLayer) l.threeDLayer=true;
                    // Pale, near-white fill reads as glass far better than a saturated color.
                    try{
                        var td=l.property("ADBE Text Properties").property("ADBE Text Document");
                        var d=td.value; d.fillColor=[0.94,0.97,1]; d.applyFill=true; td.setValue(d);
                    }catch(e){}
                    // Extrusion + bevel (only actually renders with the Cinema 4D renderer, but is safe to set regardless).
                    try{
                        var grp=l.property("ADBE Extrsn Bvl Mtrl Grp");
                        if(grp){
                            var depth=grp.property("ADBE Extrsn Depth"); if(depth){ depth.setValue(26); extruded++; }
                            var bevelDepth=grp.property("ADBE Bevel Depth"); if(bevelDepth) bevelDepth.setValue(6);
                        }
                    }catch(e){}
                    // Material Options: low ambient/diffuse, high specular/shininess, zero metal, high light
                    // transmission — this combination is what reads as "glass" rather than "plastic" or "metal".
                    try{
                        var mat=l.property("ADBE Material Options Group");
                        if(mat){
                            try{ mat.property("ADBE Casts Shadows").setValue(1); }catch(e){}
                            try{ mat.property("ADBE Light Transmission").setValue(78); }catch(e){}
                            try{ mat.property("ADBE Accepts Shadows").setValue(1); }catch(e){}
                            try{ mat.property("ADBE Accepts Lights").setValue(1); }catch(e){}
                            try{ mat.property("ADBE Ambient Coefficient").setValue(28); }catch(e){}
                            try{ mat.property("ADBE Diffuse Coefficient").setValue(42); }catch(e){}
                            try{ mat.property("ADBE Specular Coefficient").setValue(92); }catch(e){}
                            try{ mat.property("ADBE Shininess Coefficient").setValue(88); }catch(e){}
                            try{ mat.property("ADBE Metal Coefficient").setValue(0); }catch(e){}
                        }
                    }catch(e){}
                    // Soft bloom to sell the light-catching glass look, native Glow — no plugin needed.
                    try{
                        var fx=l.property("ADBE Effect Parade").addProperty("ADBE Glo2");
                        fx.name="MF • Glass Bloom";
                        try{ fx.property("ADBE Glow Intensity").setValue(0.6); }catch(e){}
                        try{ fx.property("ADBE Glo2-0002").setValue(60); }catch(e){} // Glow Threshold
                    }catch(e){}
                    done++;
                }catch(eLayer){}
            }
            var note = c4d
                ? " Extrusion/bevel enabled via the Cinema 4D renderer."
                : " Material look applied; true extrusion/bevel needs the Cinema 4D renderer, which isn't active on this comp/AE version — the layer is still 3D-lit and glowing.";
            return result(done>0, done>0?("Apple Glass style applied to "+done+" layer(s)."+note):"Couldn't apply the glass look to any selected layer.", {done:done,extruded:extruded,c4d:c4d});
        }catch(e){return result(false,"Glass text failed safely: "+e.toString());}finally{app.endUndoGroup();}
    }
    function specialText(mode){
        var c=comp(),layers=selectedLayersOrAll();if(!c||!layers.length)return result(false,"Select a text layer.");
        app.beginUndoGroup("Motion Forge — Special Text");
        try{for(var i=0;i<layers.length;i++){var l=layers[i],t=c.time,d=Math.max(c.frameDuration*14,.65),sc=l.transform.scale,op=l.transform.opacity,v=sc.value;
            if(mode==="apple"){sc.setValueAtTime(t,[v[0]*88/100,v[1]*88/100]);sc.setValueAtTime(t+d*.65,v);sc.setValueAtTime(t+d,[v[0]*101/100,v[1]*101/100]);sc.setValueAtTime(t+d*1.1,v);op.setValueAtTime(t,0);op.setValueAtTime(t+d*.55,100);applyEase(sc);applyEase(op);}
            else if(mode==="spring"){sc.setValueAtTime(t,[v[0]*72/100,v[1]*72/100]);sc.setValueAtTime(t+d*.55,[v[0]*108/100,v[1]*108/100]);sc.setValueAtTime(t+d,v);op.setValueAtTime(t,0);op.setValueAtTime(t+d*.4,100);applyEase(sc);applyEase(op);}
            else if(mode==="glass"){var fx=l.property("ADBE Effect Parade").addProperty("ADBE Gaussian Blur 2");fx.name="MF • Glass Softness";var b=fx.property("ADBE Gaussian Blur 2-0001");b.setValueAtTime(t,18);b.setValueAtTime(t+d,0);applyEase(b);op.setValueAtTime(t,0);op.setValueAtTime(t+d,100);applyEase(op);}
            else {var anim=l.property("ADBE Text Properties").addProperty("ADBE Text Animator");anim.name="MF • Cursor Reveal";var props=anim.property("ADBE Text Animator Properties"),a=props.addProperty("ADBE Text Opacity");a.setValue(-100);var sel=anim.property("ADBE Text Selectors").property(1);var en=sel.property("ADBE Text Percent End");en.setValueAtTime(t,0);en.setValueAtTime(t+d,100);easePropCurve(en,[.14,0],[.18,1]);}
        }return result(true,"Special text animation applied.");}catch(e){return result(false,e.toString());}finally{app.endUndoGroup();}
    }
    function env3d(mode){
        var c=comp();if(!c)return result(false,"Open a composition first.");app.beginUndoGroup("Motion Forge — 3D Environment");
        try{var created=[];function cam(){var x=c.layers.addCamera("MF • Environment Camera",[c.width/2,c.height/2]);x.position.setValue([c.width/2,c.height/2,-900]);x.pointOfInterest.setValue([c.width/2,c.height/2,0]);created.push(x);return x}function floor(){var f=c.layers.addSolid([.08,.09,.11],"MF • 3D Floor",Math.max(c.width,c.height)*3,Math.max(c.width,c.height)*3,c.pixelAspect);f.threeDLayer=true;f.position.setValue([c.width/2,c.height/2+300,300]);f.orientation.setValue([90,0,0]);created.push(f);return f}function nul(){var n=c.layers.addNull();n.name="MF • 3D Controller";n.threeDLayer=true;n.position.setValue([c.width/2,c.height/2,0]);created.push(n);return n}function light(type,name,pos,inten){var l=c.layers.addLight(name,pos);l.lightType=type;l.intensity=inten;l.threeDLayer=true;created.push(l);return l}
            if(mode==="camera"||mode==="full"){var ca=cam(),nu=nul();try{ca.parent=nu;}catch(e){}} if(mode==="floor"||mode==="full")floor(); if(mode==="lights"||mode==="full"){light(LightType.PARALLEL,"MF • Key Light",[c.width*.3,c.height*.25,-400],90);light(LightType.POINT,"MF • Fill Light",[c.width*.75,c.height*.45,-150],45);light(LightType.SPOT,"MF • Rim Light",[c.width*.55,c.height*.2,350],70);}return result(true,"3D environment created.",{layers:created.length});}catch(e){return result(false,e.toString());}finally{app.endUndoGroup();}
    }
    function importSFX(){
        try{var f=File.openDialog("Choose a WAV/MP3 SFX file","Audio:*.wav;*.mp3;*.aif;*.aiff",false);if(!f)return result(false,"Import cancelled.");var io=app.project.importFile(new ImportOptions(f));var c=comp();if(c)io= c.layers.add(io);return result(true,"SFX imported at the current comp time.");}catch(e){return result(false,e.toString());}
    }
    function videoWhip(){
        var c=comp(),layers=selectedLayersOrAll();if(!c||!layers.length)return result(false,"Select one or more video/image layers.");app.beginUndoGroup("Motion Forge — Whip Pan");
        try{var t=c.time,d=Math.max(c.frameDuration*10,.38),n=0;for(var i=0;i<layers.length;i++){var l=layers[i],p=l.transform.position,op=l.transform.opacity,sc=l.transform.scale,v=p.value,sv=sc.value;p.setValueAtTime(t,[v[0]-c.width*.16,v[1]]);p.setValueAtTime(t+d,v);op.setValueAtTime(t,0);op.setValueAtTime(t+d,100);sc.setValueAtTime(t,[sv[0]*108/100,sv[1]*108/100]);sc.setValueAtTime(t+d,sv);try{var fx=l.property("ADBE Effect Parade").addProperty("ADBE Motion Blur");fx.name="MF • Whip Motion";}catch(e){}easePropCurve(p,[.55,0],[.92,.72]);easePropCurve(op,[.55,0],[.92,.72]);easePropCurve(sc,[.55,0],[.92,.72]);n++;}return result(true,"Whip Pan applied to "+n+" layer(s).");}catch(e){return result(false,e.toString());}finally{app.endUndoGroup();}
    }

    function videoTransition(kind){
        var c=comp(),layers=selectedLayersOrAll();if(!c||!layers.length)return result(false,"Select a video/image layer.");app.beginUndoGroup("Motion Forge — Video Transition");
        try{for(var i=0;i<layers.length;i++){var l=layers[i],t=c.time,d=Math.max(c.frameDuration*10,.45),op=l.transform.opacity,sc=l.transform.scale,pos=l.transform.position,v=sc.value,p=pos.value;op.setValueAtTime(t,0);op.setValueAtTime(t+d,100);
            if(kind==="crossfade"){ op.setValueAtTime(t,0);op.setValueAtTime(t+d,100); } else if(kind==="zoom"){sc.setValueAtTime(t,[v[0]*112/100,v[1]*112/100]);sc.setValueAtTime(t+d,v);} else if(kind==="wipe"){var fx=l.property("ADBE Effect Parade").addProperty("ADBE Linear Wipe");fx.name="MF • Wipe Transition";var tr=fx.property("ADBE Linear Wipe-0001");tr.setValueAtTime(t,100);tr.setValueAtTime(t+d,0);} else if(kind==="spin"){l.transform.rotation.setValueAtTime(t,l.transform.rotation.value-18);l.transform.rotation.setValueAtTime(t+d,l.transform.rotation.value);} else {pos.setValueAtTime(t,[p[0]+(kind==="left"?-c.width*.18:c.width*.18),p[1]]);pos.setValueAtTime(t+d,p);}
            applyEase(op);applyEase(sc);applyEase(pos);}
            return result(true,"Video transition applied.");}catch(e){return result(false,e.toString());}finally{app.endUndoGroup();}
    }

    function cameraOrbit(){ return camera("orbit"); }
    function smartFit(){
        var c=comp(),layers=selectedLayersOrAll();if(!c||!layers.length)return result(false,"Select one or more layers.");app.beginUndoGroup("Motion Forge — Smart Fit");
        try{var n=0;for(var i=0;i<layers.length;i++){var l=layers[i],r=l.sourceRectAtTime(c.time,false),sx=(c.width*.78)/Math.max(1,r.width),sy=(c.height*.78)/Math.max(1,r.height),s=Math.min(sx,sy)*100;if(l.transform&&l.transform.scale){l.transform.scale.setValue([s,s]);l.transform.position.setValue([c.width/2,c.height/2]);n++;}}return result(true,"Smart Fit applied to "+n+" layer(s).");}catch(e){return result(false,e.toString());}finally{app.endUndoGroup();}
    }
    function glowPulse(){
        var c=comp(),layers=selectedLayersOrAll();if(!c||!layers.length)return result(false,"Select one or more layers.");app.beginUndoGroup("Motion Forge — Glow Pulse");
        try{var t=c.time,d=Math.max(c.frameDuration*18,.75),n=0;for(var i=0;i<layers.length;i++){try{var fx=layers[i].property("ADBE Effect Parade").addProperty("ADBE Glo2");fx.name="MF • Glow Pulse";var g=fx.property("ADBE Glow Intensity");g.setValueAtTime(t,0);g.setValueAtTime(t+d*.45,1.35);g.setValueAtTime(t+d,.25);easePropCurve(g,[.2,.05],[.25,1]);n++;}catch(e){}}return result(n>0,"Glow Pulse applied.",{added:n});}catch(e){return result(false,e.toString());}finally{app.endUndoGroup();}
    }

    function parallaxTitle(){
        var c=comp(),layers=textLayers();if(!c||!layers.length)return result(false,"Select one or more text layers.");app.beginUndoGroup("Motion Forge — Parallax Title");
        try{var cam=null;for(var i=1;i<=c.numLayers;i++){if(c.layer(i).matchName==="ADBE Camera Layer"){cam=c.layer(i);break;}}if(!cam)cam=c.layers.addCamera("MF • Parallax Camera",[c.width/2,c.height/2]);cam.position.setValue([c.width/2,c.height/2,-1200]);
            for(var j=0;j<layers.length;j++){var l=layers[j];l.threeDLayer=true;l.position.setValue([c.width/2,c.height/2,j*80]);}
            return result(true,"Parallax Title setup created.");}catch(e){return result(false,e.toString());}finally{app.endUndoGroup();}
    }
    function importSFXTrim(){
        try{var f=File.openDialog("Choose a WAV/MP3 SFX file","Audio:*.wav;*.mp3;*.aif;*.aiff",false);if(!f)return result(false,"Import cancelled.");var io=app.project.importFile(new ImportOptions(f)),c=comp();if(!c)return result(false,"Open a composition first.");var l=c.layers.add(io);l.startTime=c.time;l.inPoint=c.time;l.outPoint=Math.min(c.duration,c.time+Math.max(0.05,c.frameDuration*48));l.name="MF • SFX • Quick Trim";return result(true,"SFX imported and trimmed to 48 frames.");}catch(e){return result(false,e.toString());}
    }

    function addLoopBackground(kind){
        var c=comp();if(!c)return result(false,"Open a composition first.");app.beginUndoGroup("Motion Forge — Background "+kind);
        try{
            var name="MF • Background • "+kind, l=c.layers.addSolid([0.008,0.012,0.02],name,c.width,c.height,c.pixelAspect);l.inPoint=0;l.outPoint=c.duration;var fx=l.property("ADBE Effect Parade"),t0=0,t1=Math.max(c.duration,c.frameDuration*48),n=0;
            function eff(id,label){try{var e=fx.addProperty(id);e.name="MF • "+label;n++;return e;}catch(e){return null;}}
            function kf(p,a,b,curve){if(!p)return;try{p.setValueAtTime(t0,a);p.setValueAtTime(t1,b);easePropCurve(p,curve[0],curve[1]);}catch(e){}}
            if(kind==="Aurora"){
                var w=eff("ADBE Wave Warp","Aurora Waves");if(w){try{w.property(2).setValue(28);w.property(4).setValue(18);w.property(5).setValue(2);}catch(e){}}
                var g=eff("ADBE Glo2","Aurora Glow");if(g){try{g.property("ADBE Glow Intensity").setValue(.8);}catch(e){}}
                kf(l.transform.rotation,-2,2,[[.2,.05],[.2,.95]]);l.opacity.setValue(58);
            } else if(kind==="God Rays"){
                var cc=eff("CC Radial Fast Blur","God Rays");if(cc){try{cc.property(1).setValue(65);cc.property(2).setValue(2);}catch(e){}}
                l.opacity.setValue(48);kf(l.transform.position,[c.width*.45,c.height*.4],[c.width*.55,c.height*.45],[[.18,.05],[.2,.95]]);
            } else if(kind==="Fractal Space"){
                var fr=eff("ADBE Fractal Noise","Fractal Space");if(fr){try{fr.property("ADBE Fractal Noise Contrast").setValue(120);fr.property("ADBE Fractal Noise Brightness").setValue(-35);fr.property("ADBE Fractal Noise Complexity").setValue(5);}catch(e){}try{var of=fr.property("ADBE Fractal Noise Transform").property("ADBE Fractal Noise Offset");kf(of,[c.width/2,c.height/2],[c.width/2+500,c.height/2-250],[[.2,0],[.18,1]]);}catch(e){}}
                l.opacity.setValue(65);
            } else if(kind==="Hologram"){
                var hc=eff("ADBE Checkerboard","Hologram Scanlines");if(hc){try{hc.property(1).setValue(10);hc.property(2).setValue(10);}catch(e){}}
                var hg=eff("ADBE Glo2","Hologram Glow");if(hg){try{hg.property("ADBE Glow Intensity").setValue(.7);}catch(e){}}
                l.opacity.setValue(38);kf(l.transform.position,[c.width/2,c.height/2-20],[c.width/2,c.height/2+20],[[.25,.05],[.25,.95]]);
            } else if(kind==="CRT"){
                var cm=eff("ADBE Mosaic","CRT Pixel Grid");if(cm){try{cm.property(1).setValue(160);cm.property(2).setValue(90);}catch(e){}}
                var cr=eff("ADBE Wave Warp","CRT Scan");if(cr){try{cr.property(2).setValue(8);cr.property(4).setValue(12);}catch(e){}}
                l.opacity.setValue(30);
            } else if(kind==="Halftone"){
                var hm=eff("ADBE Mosaic","Halftone Grid");if(hm){try{hm.property(1).setValue(90);hm.property(2).setValue(50);}catch(e){}}
                l.opacity.setValue(24);kf(l.transform.scale,[110,110],[125,125],[[.25,.05],[.2,1]]);
            } else if(kind==="Chromatic"){
                var rg=eff("ADBE Channel Mixer","Chromatic Base");
                var bl=eff("ADBE Gaussian Blur 2","Chromatic Softness");if(bl){try{bl.property("ADBE Gaussian Blur 2-0001").setValue(2);}catch(e){}}
                l.opacity.setValue(22);kf(l.transform.rotation,-1,1,[[.2,.05],[.2,.95]]);
            } else if(kind==="Long Gradient"){
                var gr=eff("ADBE Ramp","Long Gradient");if(gr){try{gr.property(1).setValue([0,0]);gr.property(2).setValue([c.width,c.height]);}catch(e){}}
                l.opacity.setValue(35);kf(l.transform.position,[c.width/2-120,c.height/2],[c.width/2+120,c.height/2],[[.25,.05],[.2,1]]);
            } else if(kind==="Pixel Flow"){
                var px=eff("ADBE Mosaic","Pixel Flow");if(px){try{px.property(1).setValue(120);px.property(2).setValue(68);}catch(e){}}
                kf(l.transform.scale,[100,100],[118,118],[[.18,.05],[.18,1]]);l.opacity.setValue(32);
            } else if(kind==="Liquid Warp"){
                var td=eff("ADBE Turbulent Displace","Liquid Warp");if(td){try{td.property(2).setValue(45);td.property(1).setValue(55);}catch(e){}try{kf(td.property(3),0,720,[[.18,.05],[.18,1]]);}catch(e){}}
                l.opacity.setValue(45);
            } else if(kind==="Noise Film"){
                var no=eff("ADBE Noise","Film Grain");if(no){try{no.property(1).setValue(10);}catch(e){}}
                kf(l.transform.opacity,25,40,[[.4,.05],[.4,1]]);
            } else {
                var cb=eff("ADBE Checkerboard","Grid Pulse");if(cb){try{cb.property(1).setValue(36);cb.property(2).setValue(36);}catch(e){}}
                kf(l.transform.scale,[115,115],[135,135],[[.2,.05],[.18,1]]);l.opacity.setValue(38);
            }
            return result(true,"Background created: "+kind,{layer:l.name,effects:n});
        }catch(e){return result(false,"Background failed safely: "+e.toString());}finally{app.endUndoGroup();}
    }


    // ---- Automatic beat / spike detection from the layer's real audio levels ----
    function autoBeat(){
        var c=comp(); if(!c) return result(false,"Open a composition first.");
        var l=selected();
        if(!l){ for(var i=1;i<=c.numLayers;i++){ try{ if(c.layer(i).hasAudio && c.layer(i).audioEnabled){ l=c.layer(i); break; } }catch(e){} } }
        if(!l) return result(false,"Select the audio or video layer you want to mark.");
        var hasAud=false; try{ hasAud=!!l.hasAudio; }catch(e){}
        if(!hasAud) return result(false,"\""+l.name+"\" has no audio to analyze.");
        app.beginUndoGroup("Motion Forge — Auto Beat Markers");
        try{
            var t0=l.inPoint, t1=l.outPoint, dur=t1-t0;
            if(dur<=0) return result(false,"Layer has no duration.");
            var step=1/60, n=Math.floor(dur/step);
            if(n>6000){ step=dur/6000; n=6000; }
            var amps=[], k, v, a;
            for(k=0;k<=n;k++){
                try{ v=l.audioLevels.valueAtTime(t0+k*step,false); a=Math.pow(10,Math.max(v[0],v[1])/20); }catch(e){ a=0; }
                amps.push(a);
            }
            // energy flux: positive rise versus a short trailing average
            var flux=[], w=6, s, j, avg;
            for(k=0;k<amps.length;k++){
                s=0; for(j=Math.max(0,k-w);j<k;j++) s+=amps[j];
                avg=k>0 ? s/Math.max(1,k-Math.max(0,k-w)) : amps[k];
                flux.push(Math.max(0,amps[k]-avg));
            }
            var mean=0; for(k=0;k<flux.length;k++) mean+=flux[k]; mean/=flux.length;
            var sq=0; for(k=0;k<flux.length;k++) sq+=(flux[k]-mean)*(flux[k]-mean);
            var sd=Math.sqrt(sq/flux.length);
            var fluxMax=0; for(k=0;k<flux.length;k++) if(flux[k]>fluxMax) fluxMax=flux[k];
            if(sd<1e-7 && fluxMax<1e-7){
                return result(false,"This layer's audio reads as silent/flat across its whole duration (no level variation at all), so there's nothing to find beats in. Make sure the right layer is selected and its audio isn't muted.",{mean:mean,sd:sd,max:fluxMax});
            }
            // Adaptive: start strict, then progressively loosen the threshold until something is found,
            // so "detected nothing" only ever happens when the audio is genuinely flat (handled above).
            var minGap=Math.max(1,Math.round(0.18/step)), marks=[], used=0;
            var multipliers=[1.4,1.1,0.8,0.5,0.25,0.1];
            for(var mi=0;mi<multipliers.length;mi++){
                var thr=mean+sd*multipliers[mi], last=-minGap; marks=[];
                for(k=1;k<flux.length-1;k++){
                    if(flux[k]>thr && flux[k]>=flux[k-1] && flux[k]>=flux[k+1] && (k-last)>=minGap){ marks.push(t0+k*step); last=k; }
                }
                used=multipliers[mi];
                if(marks.length>=2) break;
            }
            if(!marks.length) return result(false,"No usable beats/spikes found even with a relaxed threshold — this audio may be too uniform (e.g. constant tone or white noise).",{mean:mean,sd:sd});
            var mp=c.markerProperty; if(!mp) return result(false,"This After Effects version does not expose composition markers.");
            for(k=0;k<marks.length;k++){ var mv=new MarkerValue("Beat "+(k+1)); mv.comment="Motion Forge • auto"; mp.setValueAtTime(marks[k],mv); }
            return result(true,"Marked "+marks.length+" beats/spikes automatically (sensitivity "+used.toFixed(2)+").",{count:marks.length,sensitivity:used});
        }catch(e){return result(false,"Beat detection failed safely: "+e.toString());}finally{app.endUndoGroup();}
    }

    function addBeatMarkers(bpm){
        var c=comp(); if(!c)return result(false,"Open a composition first.");
        bpm=Math.max(20,Math.min(300,num(bpm,120)));
        var beat=60/bpm, start=c.workAreaStart, end=Math.min(c.duration,c.workAreaStart+c.workAreaDuration);
        app.beginUndoGroup("Motion Forge — Beat Markers");
        try{
            var mp=c.markerProperty, n=0;
            if(!mp) return result(false,"This After Effects version does not expose composition markers.");
            for(var t=start;t<end-0.0001;t+=beat){
                var mv=new MarkerValue("Beat "+(n+1));
                mv.comment="Motion Forge • "+bpm+" BPM";
                mp.setValueAtTime(t,mv); n++;
            }
            return result(true,"Created "+n+" beat markers at "+bpm+" BPM.",{bpm:bpm,markers:n});
        }catch(e){return result(false,"Beat markers failed safely: "+e.toString());}finally{app.endUndoGroup();}
    }

    function shakeTransition(style){
        var c=comp(),layers=selectedLayersOrAll(); if(!c||!layers.length)return result(false,"Select one or more layers.");
        style=style||"impact";
        var curves={
            impact:[[.16,0],[.12,1]],
            snap:[[.08,.02],[.22,1]],
            elastic:[[.12,1.18],[.22,.94]]
        };
        var curve=curves[style]||curves.impact;
        app.beginUndoGroup("Motion Forge — Shake Transition");
        try{
            var t=c.time,d=Math.max(c.frameDuration*14,.55),n=0;
            for(var i=0;i<layers.length;i++){
                var l=layers[i],p=l.transform.position,r=l.transform.rotation,s=l.transform.scale,o=l.transform.opacity;
                var pv=p.value,rv=r.value,sv=s.value;
                var amp=Math.max(8,c.width*.012);
                p.setValueAtTime(t,[pv[0]-amp,pv[1]]);
                p.setValueAtTime(t+d*.22,[pv[0]+amp*.72,pv[1]-amp*.35]);
                p.setValueAtTime(t+d*.44,[pv[0]-amp*.45,pv[1]+amp*.18]);
                p.setValueAtTime(t+d*.70,[pv[0]+amp*.16,pv[1]]);
                p.setValueAtTime(t+d,pv);
                r.setValueAtTime(t,rv-5);r.setValueAtTime(t+d*.25,rv+4);r.setValueAtTime(t+d*.55,rv-2);r.setValueAtTime(t+d,rv);
                s.setValueAtTime(t,[sv[0]*.94,sv[1]*.94]);s.setValueAtTime(t+d*.25,[sv[0]*1.04,sv[1]*1.04]);s.setValueAtTime(t+d*.55,[sv[0]*.985,sv[1]*.985]);s.setValueAtTime(t+d,sv);
                o.setValueAtTime(t,0);o.setValueAtTime(t+d*.18,100);o.setValueAtTime(t+d,100);
                easePropCurve(p,curve[0],curve[1]);easePropCurve(r,curve[0],curve[1]);easePropCurve(s,curve[0],curve[1]);easePropCurve(o,curve[0],curve[1]);
                n++;
            }
            return result(true,""+style+" shake transition applied to "+n+" layer(s).",{duration:d});
        }catch(e){return result(false,"Shake transition failed safely: "+e.toString());}finally{app.endUndoGroup();}
    }

    function motionEffect(kind){
        var c=comp(),layers=selectedLayersOrAll(); if(!c||!layers.length)return result(false,"Select one or more layers.");
        app.beginUndoGroup("Motion Forge — "+kind);
        try{
            var t=c.time,d=Math.max(c.frameDuration*16,.58),n=0;
            for(var i=0;i<layers.length;i++){
                var l=layers[i],p=l.transform.position,r=l.transform.rotation,s=l.transform.scale,o=l.transform.opacity;
                var pv=p.value,rv=r.value,sv=s.value;
                if(kind==="elastic"){
                    s.setValueAtTime(t,[sv[0]*.78,sv[1]*.78]);s.setValueAtTime(t+d*.45,[sv[0]*1.10,sv[1]*1.10]);s.setValueAtTime(t+d*.72,[sv[0]*.97,sv[1]*.97]);s.setValueAtTime(t+d,sv);
                    easePropCurve(s,[.11,0],[.19,1]);
                } else if(kind==="swing"){
                    r.setValueAtTime(t,rv-22);r.setValueAtTime(t+d*.38,rv+10);r.setValueAtTime(t+d*.70,rv-4);r.setValueAtTime(t+d,rv);easePropCurve(r,[.16,0],[.18,1]);
                } else if(kind==="slam"){
                    p.setValueAtTime(t,[pv[0],pv[1]+Math.max(80,c.height*.12)]);s.setValueAtTime(t,[sv[0]*1.08,sv[1]*.92]);o.setValueAtTime(t,0);
                    p.setValueAtTime(t+d*.62,pv);s.setValueAtTime(t+d*.62,sv);o.setValueAtTime(t+d*.5,100);easePropCurve(p,[.08,0],[.18,1]);easePropCurve(s,[.08,0],[.18,1]);easePropCurve(o,[.08,0],[.18,1]);
                } else if(kind==="pulse"){
                    s.setValueAtTime(t,sv);s.setValueAtTime(t+d*.35,[sv[0]*1.06,sv[1]*1.06]);s.setValueAtTime(t+d*.70,[sv[0]*.985,sv[1]*.985]);s.setValueAtTime(t+d,sv);easePropCurve(s,[.22,.05],[.20,1]);
                } else if(kind==="spiral"){
                    p.setValueAtTime(t,[pv[0]-60,pv[1]+35]);r.setValueAtTime(t,rv-35);s.setValueAtTime(t,[sv[0]*.88,sv[1]*.88]);o.setValueAtTime(t,0);
                    p.setValueAtTime(t+d,pv);r.setValueAtTime(t+d,rv);s.setValueAtTime(t+d,sv);o.setValueAtTime(t+d,100);easePropCurve(p,[.15,0],[.17,1]);easePropCurve(r,[.15,0],[.17,1]);easePropCurve(s,[.15,0],[.17,1]);easePropCurve(o,[.15,0],[.17,1]);
                } else if(kind==="float"){
                    p.setValueAtTime(t,[pv[0],pv[1]+25]);p.setValueAtTime(t+d*.5,[pv[0],pv[1]-12]);p.setValueAtTime(t+d,pv);easePropCurve(p,[.25,.05],[.25,1]);
                }
                n++;
            }
            return result(true,kind+" motion applied to "+n+" layer(s).",{duration:d});
        }catch(e){return result(false,kind+" failed safely: "+e.toString());}finally{app.endUndoGroup();}
    }

    // ---- Camera rig slots: Slot 1 = the Null the camera is parented to, Slot 2 = destination layer ----
    var mfSlotA=null, mfSlotB=null;
    function slotResolve(rec){
        if(!rec) return null;
        try{
            var proj=app.project;
            for(var i=1;i<=proj.numItems;i++){
                var it=proj.item(i);
                if(it instanceof CompItem && it.id===rec.compId){
                    if(rec.layerIndex>=1 && rec.layerIndex<=it.numLayers) return {comp:it,layer:it.layer(rec.layerIndex)};
                }
            }
        }catch(e){}
        return null;
    }
    function setRigSlot(which){
        var c=comp(); if(!c) return result(false,"Open a composition first.");
        var l=selected(); if(!l) return result(false,"Select a layer first.");
        var rec={compId:c.id,layerIndex:l.index,layerName:l.name};
        if(which==="A"){ mfSlotA=rec; return result(true,"Slot 1 (Rig Null) = \""+l.name+"\"",{slot:"A",layer:l.name}); }
        mfSlotB=rec; return result(true,"Slot 2 (Destination) = \""+l.name+"\"",{slot:"B",layer:l.name});
    }
    function clearRigSlots(){ mfSlotA=null; mfSlotB=null; return result(true,"Camera rig slots cleared.",{slot:"clear"}); }
    function rigJump(){
        if(!mfSlotA) return result(false,"Set Slot 1 first: select the Null your camera is parented to, then press Set Slot 1.");
        if(!mfSlotB) return result(false,"Set Slot 2 first: select the text/image/layer to jump to, then press Set Slot 2.");
        var ra=slotResolve(mfSlotA), rb=slotResolve(mfSlotB);
        if(!ra||!ra.layer) return result(false,"Slot 1's layer no longer exists. Set it again.");
        if(!rb||!rb.layer) return result(false,"Slot 2's layer no longer exists. Set it again.");
        if(ra.comp.id!==rb.comp.id) return result(false,"Slot 1 and Slot 2 must be in the same composition.");
        var c=ra.comp, rig=ra.layer, dest=rb.layer, t=c.time;
        app.beginUndoGroup("Motion Forge — Camera Rig Jump");
        try{
            try{ if(!rig.threeDLayer) rig.threeDLayer=true; }catch(e){}
            var anchor=[0,0,0];
            try{ var av=dest.property("ADBE Transform Group").property("ADBE Anchor Point").value; if(av instanceof Array){anchor=[av[0]||0,av[1]||0,av[2]||0];} }catch(e){}
            var world=null;
            try{ world=dest.toWorld(anchor,t); }catch(e){ world=null; }
            if(!world){ try{ var pv=dest.transform.position.value; world=[pv[0]||0,pv[1]||0,pv[2]||0]; }catch(e){ world=[c.width/2,c.height/2,0]; } }
            safeKey(rig.property("ADBE Transform Group").property("ADBE Position"),t,world);
            var note="";
            try{
                if(dest.threeDLayer){
                    var o=dest.property("ADBE Transform Group").property("ADBE Orientation").value;
                    if(o instanceof Array){ safeKey(rig.property("ADBE Transform Group").property("ADBE Orientation"),t,o); note=" Orientation copied too."; }
                }
            }catch(e){}
            if(rig.parent) note+=" (Slot 1 is parented to another layer, so position is relative to that parent.)";
            return result(true,"\""+rig.name+"\" jumped to \""+dest.name+"\"."+note,{rig:rig.name,dest:dest.name});
        }catch(e){return result(false,"Rig jump failed safely: "+e.toString());}finally{app.endUndoGroup();}
    }

    // ---- Apple tab: iMessage bubbles + iPhone notification, built and pre-composed ----
    function roundedShape(x0,y0,w,h,r){
        var k=r*0.5523, s=new Shape();
        s.vertices=[[x0+r,y0],[x0+w-r,y0],[x0+w,y0+r],[x0+w,y0+h-r],[x0+w-r,y0+h],[x0+r,y0+h],[x0,y0+h-r],[x0,y0+r]];
        s.inTangents=[[-k,0],[0,0],[0,-k],[0,0],[k,0],[0,0],[0,k],[0,0]];
        s.outTangents=[[0,0],[k,0],[0,0],[0,k],[0,0],[-k,0],[0,0],[0,-k]];
        s.closed=true; return s;
    }
    function fontOk(ps){ try{ var f=app.fonts.getFontsByPostScriptName(ps); return !!(f&&f.length); }catch(e){ return null; } }
    function mkText(c,txt,size,color,just,pos,font,name){
        var l=c.layers.addText(txt), p=l.property("ADBE Text Properties").property("ADBE Text Document"), d=p.value;
        d.fontSize=size; d.fillColor=color; d.applyFill=true; d.applyStroke=false;
        try{ d.font=font; }catch(e){}
        try{ d.justification=just; }catch(e){}
        p.setValue(d); l.name=name;
        var r=l.sourceRectAtTime(c.time,false);
        // Anchor explicitly at the text's own visual center (or left/right edge for
        // left/right-justified text), rather than assuming AE's default text anchor is
        // [0,0] — that assumption is what was pushing text downward / off-center.
        var ax = (just===ParagraphJustification.RIGHT_JUSTIFY) ? (r.left+r.width) : (just===ParagraphJustification.CENTER_JUSTIFY ? (r.left+r.width/2) : r.left);
        var ay = r.top+r.height/2;
        try{ l.transform.anchorPoint.setValue([ax,ay]); }catch(e){}
        l.transform.position.setValue(pos);
        return l;
    }
    function mkBoxText(c,txt,size,color,boxW,boxH,topLeft,font,name){
        var l=c.layers.addBoxText([boxW,boxH],txt);
        var p=l.property("ADBE Text Properties").property("ADBE Text Document"), d=p.value;
        d.fontSize=size; d.fillColor=color; d.applyFill=true; d.applyStroke=false;
        try{ d.font=font; }catch(e){}
        try{ d.justification=ParagraphJustification.LEFT_JUSTIFY; }catch(e){}
        p.setValue(d); l.name=name;
        try{ l.transform.anchorPoint.setValue([0,0]); }catch(e){}
        l.transform.position.setValue(topLeft);
        return l;
    }
    function mkPill(c,w,h,rad,color,name,tailSide){
        var sl=c.layers.addShape(); sl.name=name;
        var g=sl.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
        var cont=g.property("ADBE Vectors Group");
        var rc=cont.addProperty("ADBE Vector Shape - Rect");
        rc.property("ADBE Vector Rect Size").setValue([w,h]);
        rc.property("ADBE Vector Rect Roundness").setValue(rad);
        if(tailSide){
            var sg=cont.addProperty("ADBE Vector Shape - Group"), sh=new Shape(), sx=tailSide>0?1:-1;
            sh.vertices=[[sx*(w/2-30),h/2-16],[sx*(w/2+9),h/2+5],[sx*(w/2-34),h/2-1]];
            sh.inTangents=[[0,0],[sx*3,-3],[0,0]]; sh.outTangents=[[0,0],[-sx*8,0],[0,0]];
            sh.closed=true; sg.property("ADBE Vector Shape").setValue(sh);
        }
        var f=cont.addProperty("ADBE Vector Graphic - Fill"); f.property("ADBE Vector Fill Color").setValue(color);
        return sl;
    }
    function attach(child,parent){ try{ child.setParentWithJump(parent); }catch(e){ try{ child.parent=parent; }catch(e2){} } }
    function popIn(layer,t,kids){
        var tr=layer.property("ADBE Transform Group");
        var sc=tr.property("ADBE Scale"), op=tr.property("ADBE Opacity"), ps=tr.property("ADBE Position"), base=ps.value;
        sc.setValueAtTime(t,[55,55]); sc.setValueAtTime(t+.14,[106,106]); sc.setValueAtTime(t+.26,[100,100]); easePropCurve(sc,[.2,0],[.2,1]);
        op.setValueAtTime(t,0); op.setValueAtTime(t+.09,100);
        ps.setValueAtTime(t,[base[0],base[1]+36]); ps.setValueAtTime(t+.26,[base[0],base[1]]); easePropCurve(ps,[.2,0],[.2,1]);
        for(var i=0;i<kids.length;i++){ var o=kids[i].property("ADBE Transform Group").property("ADBE Opacity"); o.setValueAtTime(t,0); o.setValueAtTime(t+.09,100); }
    }
    function dropIn(layer,t,kids){
        var tr=layer.property("ADBE Transform Group"), ps=tr.property("ADBE Position"), op=tr.property("ADBE Opacity"), base=ps.value;
        ps.setValueAtTime(t,[base[0],base[1]-260]); ps.setValueAtTime(t+.28,[base[0],base[1]+14]); ps.setValueAtTime(t+.4,[base[0],base[1]]); easePropCurve(ps,[.2,0],[.2,1]);
        op.setValueAtTime(t,0); op.setValueAtTime(t+.1,100);
        for(var i=0;i<kids.length;i++){ var o=kids[i].property("ADBE Transform Group").property("ADBE Opacity"); o.setValueAtTime(t,0); o.setValueAtTime(t+.1,100); }
    }
    function appleBuild(payload){
        var c=comp(); if(!c) return result(false,"Open a composition first.");
        var o={}; try{ o=JSON.parse(payload||"{}"); }catch(e){ o={}; }
        var kind=o.kind||"blue", text=(o.text&&String(o.text).length)?String(o.text):"Message", sender=(o.sender&&String(o.sender).length)?String(o.sender):"Messages";
        var sc=c.width/1080, notes=[];
        var psName=o.sfPro?"SFProDisplay-Bold":"ArialMT";
        var boldName=o.sfPro?"SFProDisplay-Bold":"Arial-BoldMT";
        if(o.sfPro && fontOk("SFProDisplay-Bold")===false) notes.push("SF Pro Display Bold isn't installed on this computer, so After Effects substituted a fallback font. Install Apple's SF Pro font and it will be used.");
        var iconFile=null;
        if(kind==="notif"){
            iconFile=File.openDialog("Choose the notification icon / app image");
            if(!iconFile) return result(false,"Cancelled: no notification image chosen.");
        }
        app.beginUndoGroup("Motion Forge — Apple "+kind);
        try{
            var t=c.time, made=[], anim=!!o.animate, main=null, kids=[];
            if(kind==="notif"){
                var bw=c.width*0.92, cx=c.width/2, top=110*sc;
                var iconTarget=112*sc, padX=28*sc, padTop=22*sc, padBottom=24*sc, msgGap=8*sc;
                var left=cx-bw/2;
                var tx=left+padX+iconTarget+26*sc;
                var msgBoxW=Math.max(60,(left+bw-30*sc)-tx-10*sc), msgFontSize=34*sc;
                // Create the message as wrapping box text FIRST so we can measure how tall it really is.
                var t2=mkBoxText(c,text,msgFontSize,[0.16,0.16,0.18],msgBoxW,msgFontSize*6,[tx,0],psName,"MF • Notif Message");
                var mr=t2.sourceRectAtTime(t,false), msgH=Math.max(msgFontSize*1.2,mr.height);
                var senderH=38*sc*1.25;
                var bh=Math.max(170*sc, padTop+senderH+msgGap+msgH+padBottom);
                var cy=top+bh/2;
                var banner=mkPill(c,bw,bh,Math.min(52*sc,bh/2),[0.89,0.89,0.9],"MF • Notification",0);
                banner.transform.position.setValue([cx,cy]); made.push(banner); main=banner;
                var item=app.project.importFile(new ImportOptions(iconFile)), icon=c.layers.add(item); icon.name="MF • Notif Icon";
                var iw=item.width||100, ih=item.height||100;
                icon.transform.scale.setValue([iconTarget/iw*100,iconTarget/iw*100]);
                var m=icon.Masks.addProperty("Mask"); m.property("Mask Shape").setValue(roundedShape(0,0,iw,ih,iw*0.225));
                icon.transform.position.setValue([left+padX,cy-bh/2+padTop]);
                made.push(icon); kids.push(icon);
                var t1=mkText(c,sender,38*sc,[0.05,0.05,0.06],ParagraphJustification.LEFT_JUSTIFY,[tx,cy-bh/2+padTop+38*sc*0.55],boldName,"MF • Notif Sender");
                t2.transform.position.setValue([tx,cy-bh/2+padTop+senderH+msgGap]);
                var t3=mkText(c,"now",30*sc,[0.4,0.4,0.42],ParagraphJustification.RIGHT_JUSTIFY,[left+bw-30*sc,cy-bh/2+padTop+38*sc*0.55],psName,"MF • Notif Time");
                made.push(t1,t2,t3); kids.push(t1,t2,t3);
            }else{
                var blue=(kind==="blue");
                var probe=mkText(c,text,46*sc,blue?[1,1,1]:[0,0,0],ParagraphJustification.CENTER_JUSTIFY,[0,0],psName,"MF • Bubble Text");
                var r=probe.sourceRectAtTime(t,false), w=r.width+70*sc, h=r.height+44*sc; if(h<86*sc)h=86*sc;
                var cx2=blue?(c.width-70*sc-w/2):(70*sc+w/2), cy2=c.height/2;
                var col=blue?[0,0.478,1]:[0.898,0.898,0.918];
                var bub=mkPill(c,w,h,Math.min(h/2,58*sc),col,"MF • "+(blue?"Blue":"Grey")+" Bubble",blue?1:-1);
                bub.transform.position.setValue([cx2,cy2]);
                probe.transform.position.setValue([cx2,cy2]);
                made.push(bub,probe); main=bub; kids.push(probe);
            }
            for(var i=0;i<kids.length;i++) attach(kids[i],main);
            if(anim){ if(kind==="notif") dropIn(main,t,kids); else popIn(main,t,kids); }
            var idx=[]; for(var j=0;j<made.length;j++) idx.push(made[j].index);
            var nm="MF • "+(kind==="notif"?"iPhone Notification":kind==="blue"?"iMessage Blue":"iMessage Grey");
            var pc=c.layers.precompose(idx,nm,true);
            var pl=null;
            try{ for(var pIdx=1;pIdx<=c.numLayers;pIdx++){ if(c.layer(pIdx).source===pc){ pl=c.layer(pIdx); break; } } }catch(eFind){}
            if(o.deepGlow && pl){
                try{
                    var fx=pl.property("ADBE Effect Parade"), got=false, cand=["Deep Glow 2","DeepGlow2","DEEPGLOW2","Deep Glow"];
                    for(var k=0;k<cand.length&&!got;k++){ try{ var e=fx.addProperty(cand[k]); if(e){got=true;} }catch(err){} }
                    if(!got){ try{ var g=fx.addProperty("ADBE Glo2"); g.name="Glow (Deep Glow 2 not installed)"; notes.push("Deep Glow 2 isn't installed, so I added After Effects' built-in Glow instead."); }catch(err2){ notes.push("Deep Glow 2 isn't installed and the built-in Glow couldn't be added."); } }
                }catch(eGlow){ notes.push("Couldn't add a glow effect to the result: "+eGlow.toString()); }
            }
            return result(true,"Built "+nm+" in a pre-comp."+(notes.length?(" "+notes.join(" ")):""),{kind:kind});
        }catch(e){return result(false,"Apple build failed safely: "+e.toString());}finally{app.endUndoGroup();}
    }

    // ---- Custom Script Runner: user pastes arbitrary ExtendScript, we run it with convenience vars ----
    // ---- Image -> Animated Template: import a picked image, fit it, optionally add an
    // editable caption text layer on top (parented), optionally animate, optionally precompose ----
    function imageToTemplate(payload){
        var c=comp(); if(!c) return result(false,"Open a composition first.");
        var o={}; try{ o=JSON.parse(payload||"{}"); }catch(e){ o={}; }
        var f=File.openDialog("Choose the image to turn into an animated template");
        if(!f) return result(false,"Cancelled: no image chosen.");
        app.beginUndoGroup("Motion Forge — Image Template");
        try{
            var item=app.project.importFile(new ImportOptions(f));
            var img=c.layers.add(item);
            img.name="MF • Template • "+f.name.replace(/\.[^.]+$/,"");
            var iw=item.width||c.width, ih=item.height||c.height;
            var fitScale=Math.min((c.width*0.82)/iw,(c.height*0.82)/ih)*100;
            img.transform.scale.setValue([fitScale,fitScale]);
            img.transform.position.setValue([c.width/2,c.height/2]);
            if(o.matte){
                try{
                    var mk=img.Masks.addProperty("Mask");
                    var inset=Math.min(iw,ih)*0.02;
                    mk.property("Mask Shape").setValue(roundedShape(inset,inset,iw-inset*2,ih-inset*2,0));
                    mk.maskMode=MaskMode.ADD;
                }catch(eMask){}
            }
            var made=[img], textLayer=null;
            if(o.addText!==false){
                try{
                    var capText=(o.text && String(o.text).length) ? String(o.text) : "Your text here";
                    // Position relative to the image's own actual rendered bounds, not a fixed comp
                    // percentage — otherwise a wide/short image leaves the caption stranded far below it.
                    var imgHalfH=(ih*fitScale/100)/2, imgBottom=c.height/2+imgHalfH;
                    var pad=Math.max(16,c.height*0.03);
                    var capY=Math.min(imgBottom+pad+ (Math.max(22,c.width*0.035))/2, c.height-pad);
                    textLayer=mkText(c,capText,Math.max(22,c.width*0.035),[1,1,1],ParagraphJustification.CENTER_JUSTIFY,[c.width/2,capY],"ArialMT","MF • Template Caption");
                    made.push(textLayer);
                    attach(textLayer,img);
                }catch(eText){}
            }
            if(o.animate){ try{ popIn(img,c.time,textLayer?[textLayer]:[]); }catch(eAnim){} }
            var note="";
            if(o.precompose!==false){
                try{
                    var idx=[]; for(var i=0;i<made.length;i++) idx.push(made[i].index);
                    c.layers.precompose(idx,"MF • Image Template",true);
                    note=", collapsed into one pre-comp layer";
                }catch(ePre){ note=" (couldn't collapse into a pre-comp, but the layer(s) are in your timeline)"; }
            }
            return result(true,"Image added as an animated template"+(textLayer?" with an editable caption text layer on top":"")+note+".",{});
        }catch(e){return result(false,"Image template failed safely: "+e.toString());}finally{app.endUndoGroup();}
    }

    function runScript(payload){
        var o={}; try{ o=JSON.parse(payload||"{}"); }catch(e){ o={code:String(payload||"")}; }
        var code=o.code||"";
        if(!code || !code.length) return result(false,"Paste some ExtendScript code first.");
        var c=comp(), sel=selectedLayersOrAll();
        app.beginUndoGroup("Motion Forge — Custom Script");
        try{
            var comp=c, layers=sel, layer=sel.length?sel[0]:null, project=app.project;
            var __mfReturn = eval(code);
            var extra = (__mfReturn!==undefined && __mfReturn!==null) ? (" Returned: "+String(__mfReturn)) : "";
            return result(true,"Script ran successfully."+extra,{});
        }catch(e){
            return result(false,"Script error: "+e.toString()+(e.line?(" (near line "+e.line+")"):""));
        }finally{app.endUndoGroup();}
    }
    // ---- Attach a chosen audio file to every selected clip, aligned to each clip's start ----
    function attachAudioToSelected(){
        var c=comp(); if(!c) return result(false,"Open a composition first.");
        var sel=c.selectedLayers; if(!sel||!sel.length) return result(false,"Select one or more clips first (click each while holding Shift).");
        var f=File.openDialog("Choose the audio file to add to each selected clip");
        if(!f) return result(false,"Cancelled: no audio file chosen.");
        app.beginUndoGroup("Motion Forge — Attach Audio to Clips");
        try{
            var item=app.project.importFile(new ImportOptions(f));
            var n=0;
            for(var i=0;i<sel.length;i++){
                var clip=sel[i];
                try{
                    var al=c.layers.add(item);
                    al.name="MF • SFX • "+clip.name;
                    al.startTime=clip.inPoint;
                    n++;
                }catch(e){}
            }
            return result(n>0, n>0?("Added \""+f.name+"\" to "+n+" selected clip(s)."):"Couldn't add the audio to any selected clip.",{count:n,file:f.name});
        }catch(e){return result(false,"Attach audio failed safely: "+e.toString());}finally{app.endUndoGroup();}
    }

    function diagnostics(){
        var checks=["fadeUp","pop","slideLeft","slideRight","zoom","rotate","blurReveal","shake","textType","textTracking","textWipe","bounce","textOut","textMagnetic","videoCrossfade","videoWhip","videoWipe","videoZoom","videoSpin","videoLeft","videoRight","cameraWiggle","cameraDrift","cameraPush","cameraOrbit","maskRect","maskEllipse","stagger","smartFit","glowPulse","parallaxTitle","importSFX","importSFXTrim","env3dFull","env3dCamera","env3dFloor","env3dLights","beat:120","shakeTransition:impact","motion:elastic","motion:swing","motion:slam","motion:pulse","motion:spiral","motion:float","addSolid","addAdjustment","duplicate","precomp","ease","glass","apple:standard","apple:smooth","apple:emphasized","apple:soft","apple:snap","apple:bouncy","apple:anticipate","apple:spring","apple:settle","apple:overshoot","apple:float","apple:lift","apple:drift","apple:punch","apple:reveal","addTextAdvanced:","setSlotA","setSlotB","rigJump","autoBeat","checkEffects","runScript:","attachAudio","imageTemplate:"];
        return result(true,"Motion Forge command map loaded.",{commands:checks.length,host:"ready",note:"Runtime After Effects effects are validated when applied; unsupported native effects return a safe error instead of breaking the panel."});
    }

    function info(){
        var c=comp(),s=selected(); return JSON.stringify({ok:true,data:{ae:app.version,hostVersion:HOST_VERSION,comp:c?c.name:null,selected:s?s.name:null,selectedCount:c?c.selectedLayers.length:0}});
    }
    function command(cmd){
        try{
            var a=String(cmd||"");
            if(!a)return result(false,"No command selected.");
            if(a==="info")return info();
            if(a==="addText")return addText("Motion Forge"); if(a==="glass")return appleGlass(); if(a.indexOf("apple:")===0)return appleMotion(a.substring(6)); if(a.indexOf("applyFont:")===0)return applyFont(a.substring(10)); if(a==="appleText")return specialText("apple"); if(a==="glassText")return glassText3D(); if(a==="springText")return specialText("spring"); if(a==="cursorText")return specialText("cursor"); if(a==="importSFX")return importSFX(); if(a==="env3dFull")return env3d("full"); if(a==="env3dCamera")return env3d("camera"); if(a==="env3dFloor")return env3d("floor"); if(a==="env3dLights")return env3d("lights"); if(a==="env3dNeon")return env3d("full"); if(a==="videoCrossfade")return videoTransition("crossfade"); if(a==="videoWhip")return videoWhip(); if(a==="videoWipe")return videoTransition("wipe"); if(a==="videoZoom")return videoTransition("zoom"); if(a==="videoSpin")return videoTransition("spin"); if(a==="videoLeft")return videoTransition("left"); if(a==="videoRight")return videoTransition("right"); if(a==="videoPushLeft")return videoTransition("left"); if(a==="videoPushRight")return videoTransition("right");
            if(a.indexOf("addText:")===0)return addText(a.substring(8)||"Motion Forge");
            if(a.indexOf("addTextAdvanced:")===0)return addTextAdvanced(a.substring(16));
            if(a.indexOf("runScript:")===0)return runScript(a.substring(10));
            if(a.indexOf("imageTemplate:")===0)return imageToTemplate(a.substring(14));
            if(a==="attachAudio")return attachAudioToSelected();
            if(a==="setSlotA")return setRigSlot("A");
            if(a==="setSlotB")return setRigSlot("B");
            if(a==="clearSlots")return clearRigSlots();
            if(a==="rigJump")return rigJump();
            if(a==="fadeUp")return fadeUp(); if(a==="textWipe")return textWipe(); if(a==="textMagnetic")return textMagnetic(); if(a==="smartFit")return smartFit(); if(a==="glowPulse")return glowPulse(); if(a==="cameraOrbit")return cameraOrbit(); if(a==="parallaxTitle")return parallaxTitle(); if(a==="importSFXTrim")return importSFXTrim(); if(a==="pop")return pop(); if(a==="slideLeft")return slide(-1); if(a==="slideRight")return slide(1);
            if(a==="zoom")return zoom(); if(a==="rotate")return rotate(); if(a==="blurReveal")return blurReveal(); if(a==="shake")return shake(); if(a==="ease")return easeSelected(); if(a==="textType")return textType(); if(a==="textOut")return textFadeOut(); if(a==="textTracking")return textTracking(); if(a==="bounce")return bounce(); if(a==="transitionPush")return transitionPush(); if(a==="transitionScale")return transitionScale();
            if(a==="addSolid")return addSolid(); if(a==="addAdjustment")return addAdjustment(); if(a==="duplicate")return duplicate(); if(a==="precomp")return precomp(); if(a==="cameraWiggle")return camera("wiggle"); if(a==="cameraDrift")return camera("drift"); if(a==="cameraPush")return camera("push"); if(a==="maskRect")return addMask("rect"); if(a==="maskEllipse")return addMask("ellipse"); if(a==="stagger")return stagger();
            if(a.indexOf("fx:")===0)return fxApply(a.substring(3));
            if(a==="checkEffects")return fxCheckAll();
            if(a==="effect:wiggle"){
                var ls=selectedLayersOrAll(); if(!ls.length)return result(false,"Select a layer.");
                app.beginUndoGroup("Motion Forge — Motion Wiggle");
                try{for(var wi=0;wi<ls.length;wi++)ls[wi].transform.position.expression="freq=8; amp=14; wiggle(freq,amp);";return result(true,"Motion Wiggle applied.");}
                catch(we){return result(false,we.toString());}finally{app.endUndoGroup();}
            }
            if(a==="autoBeat")return autoBeat();
            if(a.indexOf("appleUI:")===0)return appleBuild(a.substring(8));
            if(a.indexOf("beat:")===0){var bp=a.substring(5).split(",");return addBeatMarkers(bp[0]);}
            if(a.indexOf("shakeTransition:")===0)return shakeTransition(a.substring(16)||"impact");
            if(a.indexOf("motion:")===0)return motionEffect(a.substring(7));
            if(a.indexOf("overlay:")===0)return importOverlay(a.substring(8));
            if(a.indexOf("sfxfile:")===0)return importSFXBundled(a.substring(8));
            if(a==="diagnostics")return diagnostics(); if(a.indexOf("loop:")===0)return addLoopBackground(a.substring(5)); if(a.indexOf("graph:")===0){var g=a.substring(6).split(",");return graphEase(g[0],g[1],g[2],g[3]);} if(a==="removeMFFX")return removeMFEffects();
            return result(false,"Unknown command: "+a);
        }catch(e){return result(false,e.toString());}
    }
    $.global.MotionForgeCommand=command;
})();
