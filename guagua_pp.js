(function(win,doc){

    var Guagua = function(options){
        return this._init( options || {} );
    }


    if( !Array.prototype.find ){
        Array.prototype.find = function(fn){
            if( typeof fn == "function" ){
                for( var i=0;i<this.length;i++ ){
                    var item = this[i];
                    var res = fn(item,i,this) ;
                    if( res ){
                        return item ;
                        break ;
                    }
                }
            }
            return null ;
        }
    }
    if( !Array.prototype.findIndex ){
        Array.prototype.findIndex = function(fn){
            if( typeof fn == "function" ){
                for( var i=0;i<this.length;i++ ){
                    var item = this[i];
                    var res = fn(item,i,this) ;
                    if( res ){
                        return i ;
                        break ;
                    }
                }
            }
            return -1 ;
        }
    }


    function extend(src,dist){for( var prop in dist ){src[prop] = dist[prop] } return src ;}


    //缓存弹幕信息 {elem:弹幕对象，ops : 配置信息 , id弹幕唯一标识}
    var catchs = [] ;

    //弹幕构造器
    var Item = function(catchOption){
        return this._init(catchOption || {});
    }
    Item.prototype = {
        _init : function(options){
            this.ops = options.ops ;
            this.id = options.id ;
            this.config = options.config ;
            this.queue = options.queue ;

            //开始的时间
            this.startTime = null ;
            //持续时间
            this.duration = 0 ;
            //定时器 ，  用于字幕滚动完成后的回调
            this.timer = null ;
            //弹幕的弹道
            this.tj = null ;
            this._createHtml();



            return this ;
        } ,

        _createHtml : function(){
            var img = "" ;
            if( this.ops.imgUrl ){
                img = 'background-image:url('+this.ops.imgUrl+')';
            }
            this.divid = "gid_" + this.id ;
            this.elem = document.createElement("div") ;
            this.elem.id = this.divid ;
            this.elem.className = "__guaguaBox" ;
            this.elem.setAttribute("cid" , this.id) ;
            this.elem.innerHTML = '<div class="imgBox" style="'+img+'"></div>' +
                '<div class="__con" id="gg_con">'+
                this.ops.message+
                '</div>';
            this.wrapBox = document.body ;
            if( this.config.elem ) {
                this.wrapBox = document.querySelector(this.config.elem) ;
            }
            if( this.wrapBox ){
                var first = this.wrapBox.firstChild ;
                this.wrapBox.insertBefore(this.elem,first);
            }else{
                throw new Error("elem没有找到：" + this.elem) ;
                return null ;
            }
            this.img = this.elem.querySelector(".imgBox") ;

            this.setFontSize( this.config.fontSize );
            this.setFontColor( this.ops.fontColor );
            this.setZindex() ;
            this.setBackground( this.ops.background );
            this.setRadiusAndImageSize() ;



        },

        //屏幕宽高
        _updatePage : function(){
            this.winWidth = document.documentElement.scrollWidth ;
            this.winHeight = document.documentElement.scrollHeight ;
            this.itemWidth = this.elem.offsetWidth ;
            this.itemHeight = this.elem.offsetHeight;
            if( this.ops.imgUrl ){
                this.itemWidth = this.itemWidth + this.itemHeight;
            }
            this.relaMoveWidth = this.itemWidth * 2 + this.winWidth ;
            //需要移动的距离 为了保证有一个统一的值，这样滚动速度也才是一致的
            this.moveWidth = this.winWidth*this.config.durationDouble ;
        },

        setRadiusAndImageSize:function(){
            var val = this.itemHeight + "px" ;
            if(this.img){
                this.img.style.width = val ;
                this.img.style.height = val;
                this.img.style.display = "block" ;
            }
            if( this.config.isradius ){
                this.elem.style.borderRadius = val ;
                if(this.img){
                    this.img.style.borderRadius = val ;
                }
            }
        },

        setFontSize : function(size){
            this.elem.style.fontSize = size ;
            this._updatePage();
        },
        setFontColor : function(color){
            this.elem.style.color = color ;
        },
        setBackground : function(bg){
            this.elem.style.backgroundColor = bg ;
        },

        setPosition : function(){
            this.elem.style.right = -this.itemWidth + "px" ;
            if( this.tj == null ) return ;
            var index = this.tj.index;
            var val = (this.config.lineMarginTop * (index+1)) + this.itemHeight * index ;
            if( this.config.position == "bottom" ){
                this.elem.style.bottom = val + "px" ;
            }else{
                this.elem.style.top = val + "px" ;
            }
        },
        //销毁一个弹幕
        destroy:function(){
            this.elem.parentNode.removeChild(this.elem) ;
            this.removeCatchItem();
            this.queue._delTrajectory(this.id);
        },

        //根据id获取弹幕缓存的index
        getItemIndex:function(){
            var id = this.id ;
            return catchs.findIndex(function(item){
                return item.id == id ;
            });
        },
        //获取一个弹幕缓存的对象
        getItem:function(){
            var index = this.getItemIndex();
            if( index == -1 ) return null ;
            return catchs[index] ;
        },
        removeCatchItem:function(){
            var index = this.getItemIndex();
            if( index == -1 ) return null ;
            catchs.splice(index,1) ;
        },

        getDuration:function(type){
            return  this.config.durationConfig[type || 'slow'];
        },
        _show : function(){
            if( this.ops.specialPosition ){
                this.elem.classList.add("special") ;
                this.elem.style.marginLeft = -this.itemWidth/2 + "px" ;
            }else{
                this.setPosition( this.ops.position );
                this.elem.classList.add("show") ;
            }
        },
        hide : function(){
            this.elem.classList.remove("show") ;
           // this.elem.classList.remove("special") ;
            this.elem.classList.remove("specialShow") ;
        },

        setZindex : function(index){
            this.elem.style.zIndex = index ? index : this.config.zindex + catchs.length ;
        },

        _clearTimer:function(){
            if(this.timer){
                clearTimeout(this.timer) ;
                this.timer = null ;
            }
        },

        //开始滚动   tj:弹道对象
        start : function(tj){
            var _this = this ;
            var index = this.getItemIndex();
            var _delay = this.config._delay ;
            //为弹幕设置弹道
            this.tj = tj ;
            //调整弹道速度
            this.duration = this.getDuration("slow");
            var index = tj.index+1 ;
            if( index%2==0 ) { this.duration= this.duration+this.duration*0.08}
            if( index%3==0 ) { this.duration= this.duration+this.duration*0.04}
            if( index%4==0 ) { this.duration= this.duration+this.duration*0.14}
            if( index%5==0 ) { this.duration= this.duration+this.duration*0.06}

            this._clearTimer();
            this._show();

            var specialPosition = this.ops.specialPosition;
            var specialDistance = this.ops.specialDistance ;





            setTimeout(function(){
                if( !specialPosition ){
                    //var transition = "transform "+this.duration+"s linear " + this.ops.delay + "s";
                    var transition = "all "+this.duration+"s linear ";
                    this.elem.style.webkitTransition = transition ;
                    this.elem.style.transition = transition ;
                    var right = -this.moveWidth + "px" ;
                    var transform = 'translate3d('+right+',0,0)' ;
                    this.elem.style.webkitTransform = transform ;
                    this.elem.style.transform = transform ;
                    this.durationValue = this.duration*1000 ;
                }else{
                    this.durationValue = this.ops.specialDuration*1000 ;
                    if( specialPosition == 'bottom' ){
                        this.elem.style.bottom = specialDistance + "px" ;
                    }
                    if( specialPosition == "top" ){
                        this.elem.style.top = specialDistance + "px" ;
                    }
                    this.elem.classList.add("specialShow") ;
                }

                this.startTime = new Date().getTime() ;

                //结束后的回调
                this.timer = setTimeout(function(){
                    _this.destroy() ;
                    if( _this.ops.repet > 1 ){_this.reset();}
                    if( typeof _this.ops.complete == "function" ){
                        _this.ops.complete();
                    }
                },this.durationValue);

                //缓存对象
                catchs.push(this);
            }.bind(this),_delay);
        },

        //重新再次执行一遍
        reset : function(){
            this.ops.repet = this.ops.repet-1 ;
            this.queue.appendMessage(this.ops) ;
        },

    }


    Guagua.prototype = {
        _init : function(options){
            this.ops = extend({
                max : 100 ,  //弹幕最大上限
                elem : '' , //弹幕需要放置到那个元素内？  不传就放body里面
                zindex : 100000 ,
                stageHeight : 200 , //舞台的高度，就是弹幕可以弹幕要显示的位置如 top的时候是 0-150 px
                lineMarginTop : 10 ,  //弹道之间的间距
                dmMarginLeft : 40 , //弹幕之间的距离
                queueStep : 50 ,  //弹幕队列执行频率

                //滚动的倍数 ，  windowWidth * durationDouble  为了保证滚动距离一致
                durationDouble : 3 ,
                _delay : 150 ,  //执行延迟的时间

                //是否圆角
                isradius : true ,
                fontSize : "14px" ,

                //弹幕位置如果为free，则应该动态计算lines
                lines : 5 ,  //显示弹幕的行数
                position : 'top' ,   //弹幕位置  top：顶部   bottom:底部   free：全屏任意位置
                maxFontNumber : 30 ,
                durationConfig : {
                    fast : 15 ,
                    slow : 20 ,
                },
            },options);


            //距离扩大了  速度也扩大3倍
            this.ops.durationConfig.fast = this.ops.durationConfig.fast * this.ops.durationDouble ;
            this.ops.durationConfig.slow = this.ops.durationConfig.slow * this.ops.durationDouble ;

            //队列执行的间隔
            this.queueStep = this.ops.queueStep ;
            //弹道队列，每一行数据代表一个弹道，每个弹道里面存放最后一条弹幕
            this.tjs = [] ;
            //弹幕队列
            this.dms = [] ;


            //如果是全屏模式(position=free) 则动态计算lines

            if( this.ops.position == "free" ){
                var freeItem = this._createDmItem({id:"free_"+new Date().getTime(),message:"free"});
                var lineHeight = freeItem.itemHeight + this.ops.lineMarginTop ;
                this.ops.lines = Math.floor(freeItem.winHeight / lineHeight) ;
                freeItem.destroy() ;
            }

            //创建弹道
            this._createTrajectory();
            //执行队列
            this._runTrajectoryQueue();



            return this ;
        },

        //创建弹道，用于显示弹幕
        _createTrajectory : function(){
            if( this.ops.lines ){
                for( var i=0;i<this.ops.lines;i++ ){
                    this.tjs.push({
                        name : "d" + (i+1),
                        index : i ,
                        items : [] ,   //弹道内的弹幕
                    });
                }
            }
        },

        //获取弹道
        _getTrajectory : function(){
            //如果弹道内没有一个弹幕，优先塞入弹幕(优先在空闲的弹道塞入弹幕)
            //var find = this.tjs.find(function(item){ return item.items.length == []  }) ;
            //if( find  ) return find ;
            //如果弹道内都有弹幕，则查看最后一个弹幕有没有完全显示出来，如果都显示出来了，就可以继续塞入弹幕
            var result = null , dms = [] , lines = this.ops.lines;
            this.tjs.forEach(function(item,index){
                var items = item.items ;
                var last = items[items.length-1] ;
                if( last ){
                    //获取弹幕滚动了多久(获取移动时间)
                    var difftime = new Date().getTime() - last.startTime ;
                    //弹幕每微秒移动的距离
                    var s_val = last.moveWidth / last.durationValue ;
                    //每微秒速度 * 滚动时间 >=  弹幕的长度 + 弹幕间距 。  那么说明弹幕已经全部显示了，队列中可以添加新弹幕了
                    if( s_val * difftime  >= last.itemWidth + this.ops.dmMarginLeft ){
                        dms.push(item);
                    }
                }else{
                    dms.push(item);
                }
            }.bind(this));


            //如果是0说明是刚开始，那么在所有lines弹道中随机抽取
            /*
            if( dms.length <= 0 ){
                result = this.tjs[ Math.floor(Math.random() * lines) ];
            }else{

            }
            */
            if( dms.length ){
                result = dms[ Math.floor(Math.random() * dms.length) ];
            }

            return result ;
        },

        //往弹道队列中塞入一条弹幕  item：弹幕
        _addTrajectory : function(item){
            var tj = this._getTrajectory() ;
            if( tj != null ){
                tj.items.push(item);
                this._delDm(item.id);
                item.start(tj);
            }
        },
        //删除一个弹道队列中的弹幕（弹幕显示完毕后，需要从弹道中删除）, 传入弹幕id
        _delTrajectory : function(id){
            this.tjs.forEach(function(item){
                var index = item.items.findIndex(function(dm){
                    return dm.id == id ;
                }) ;
                if( index != -1 ){
                    item.items.splice(index,1);
                }
            }.bind(this));
        },
        //执行弹道队列
        _runTrajectoryQueue : function(){
            if( this.dms.length ){
                this._addTrajectory(this.dms[0]);
            }
            setTimeout( function(){
                this._runTrajectoryQueue();
            }.bind(this),this.queueStep);
        },

        //弹幕队列 添加
        _addDm : function(item){
            if(item){
                this.dms.push(item)
            }else{
                throw("添加弹幕失败:" + item);
            }
        },
        //弹幕队列 删除
        _delDm : function(id){
            var findIndex = this.dms.findIndex(function(item){
                return  item.id == id ;
            }) ;
            if( findIndex != -1 ) this.dms.splice(findIndex,1) ;
        },
        //弹幕队列 获取要执行的弹幕
        _getCurrentDm : function(){return this.dms[0] ;},


        _createDmItem : function(options){
            if( !options.message ) {
                throw new Error("弹幕内容(content)字段不能为空") ;
                return false ;
            }
            if( !options.id ) {
                throw new Error("弹幕标识(id)字段不能为空") ;
                return false ;
            }
            var params = extend({
                //必须
                id : '' , //弹幕的唯一标识
                message:"" , //弹幕内容

                //非必须
                complete : null , //完成后执行回调
                background : 'rgba(0,0,0,0.4)' ,

                //重要弹幕的显示位置  有值就代表是重要的
                specialPosition : null ,
                //特殊弹幕距离屏幕的间距距离
                specialDistance : 100 ,
                //特殊字幕的显示时间
                specialDuration : 4 ,

                fontColor : '#fff' ,
                repet : 1 , // 重复的次数

                imgUrl:"" ,
            },options||{});

            var itemParams = {
                id : params.id ,
                ops : params ,
                config : this.ops ,
                //guagua实例对象
                queue : this
            }
            return  new Item(itemParams);
        },

        appendMessage : function(options){
            var item = this._createDmItem(options);
            this._addDm(item);
            return item ;
        }







    }


    win.Guagua = Guagua ;

})(window,document);