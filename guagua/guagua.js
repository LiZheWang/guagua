(function(win,doc){

    var Guagua = function(options){
        return this._init( options || {} );
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
            this.elem = options.elem ;
            this.ops = options.ops ;
            this.id = options.id ;
            this.config = options.config ;
            this.queue = options.queue ;

            //开始的时间
            this.startTime = null ;
            //持续时间
            this.duration = this.ops.duration || this.getDuration() ;

            //定时器 ，  用于字幕滚动完成后的回调
            this.timer = null ;

            this._updatePage();

            this.setFontSize( this.ops.fontSize );
            this.setFontColor( this.ops.fontColor );
            this.setBackground( this.ops.background );
            this.setRadiusAndImageSize() ;
            this.setZindex() ;



            return this ;
        } ,
        //屏幕宽高
        _updatePage : function(){
            this.winWidth = document.documentElement.scrollWidth ;
            this.winHeight = document.documentElement.scrollHeight ;
            this.itemWidth = this.elem.offsetWidth ;
            this.itemHeight = this.elem.offsetHeight ;
            //需要移动的距离
            this.moveWidth = this.itemWidth * 2 + this.winWidth ;
        },


        setRadiusAndImageSize:function(){
            var val = this.itemHeight + "px" ;
            this.img = this.elem.getElementsByTagName("img")[0] ;
            if(this.img){
                this.img.style.width = val ;
                this.img.style.height = val;
                this.img.style.display = "block" ;
            }
            if( this.ops.isradius ){
                this.elem.style.borderRadius = val ;
                if(this.img){
                    this.img.style.borderRadius = val ;
                }
            }
        },

        setFontSize : function(size){
            this.elem.style.fontSize = size ;
        },
        setFontColor : function(color){
            this.elem.style.color = color ;
        },
        setBackground : function(bg){
            this.elem.style.backgroundColor = bg ;
        },

        setPosition : function(){
            this.elem.style.right = -this.itemWidth + "px" ;
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

        getDuration:function(){
            var duration = this.config.durationConfig[this.duration] ;
            return  duration || this.config.durationConfig['normal'];
        },

        show : function(){
            this._updatePage();
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

        setZindex(index){
            this.elem.style.zIndex = index ? index : this.config.zindex + catchs.length ;
        },

        _clearTimer:function(){
            if(this.timer){
                clearTimeout(this.timer) ;
                this.timer = null ;
            }
        },

        //开始滚动
        start : function(){
            var _this = this ;
            var index = this.getItemIndex();
            var _delay = this.ops._delay ;
            if( index != -1 ) {
                throw "抱歉id为" + this.id +"的字幕已经存在" ;
                return false ;
            };
            this._clearTimer();
            this.show();


            var specialPosition = this.ops.specialPosition;
            var specialDistance = this.ops.specialDistance ;

            setTimeout(function(){
                if( !specialPosition ){
                    var transition = "transform "+this.duration+"s linear " + this.ops.delay + "s";
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
                    _this.ops.repet > 1 ? _this.reset() : _this.destroy() ;
                    if( typeof _this.ops.complete == "function" ){
                        _this.ops.complete();
                    }
                },this.durationValue );

                //缓存对象
                catchs.push(this);
            }.bind(this),_delay);







        },


        //重新再次执行一遍
        reset : function(){
            this.removeCatchItem();
            var repet = this.ops.repet-=1 ;
            this.ops.repet = repet ;
            this.hide();
            this.elem.style.webkitTransition = null ;
            this.elem.style.transition = null ;
            this.elem.style.webkitTransform = null ;
            this.elem.style.transform = null ;


            this.start() ;
        },

    }


    Guagua.prototype = {
        _init : function(options){
            this.ops = extend({
                max : 100 ,  //弹幕最大上限
                elem : '' , //弹幕需要放置到那个元素内？  不传就放body里面
                zindex : 1000 ,
                stageHeight : 200 , //舞台的高度，就是弹幕可以弹幕要显示的位置如 top的时候是 0-150 px
                lines : 5 ,  //显示弹幕的行数
                lineMarginTop : 10 ,  //弹道之间的间距
                queueStep : 500 ,
                durationConfig : {
                    fast : 10 ,
                    slow : 20 ,
                    normal : 15 ,
                },
            },options);



            //弹道队列，每一行数据代表一个弹道，每个弹道里面存放最后一条弹幕
            this.tjs = [] ;
            //this._createTrajectory();

            this._runTrajectoryQueue();

            return this ;
        },

        //创建弹道，用于显示弹幕
        _createTrajectory : function(){
            if( this.ops.lines ){
                for( var i=0;i<this.ops.lines;i++ ){
                    this.tjs.push({
                        name : "d" + (i+1),
                        //top : (this.ops.lineMarginTop * (i+1)) + this.itemHeight * i ,
                        items : [] ,   //弹道内的弹幕
                    });
                }
            }
        },

        //获取弹道
        _getTrajectory : function(){
            //如果弹道内没有一个弹幕，优先塞入弹幕(优先在空闲的弹道塞入弹幕)
            var find = this.tjs.find(function(item){ return item.items.length == []  }) ;
            if( find ) return find ;
            //如果没有空闲的弹道，
        },

        //往弹道队列中塞入一条弹幕  item：弹幕
        _addTrajectory : function(item){
            var tj = this._getTrajectory() ;
            tj.items.push(item);
        },
        //删除一个弹道队列中的弹幕（弹幕显示完毕后，需要从弹道中删除）, 传入弹幕id
        _delTrajectory : function(id){
            this.tjs.forEach(item => {
                var index = item.items.findIndex(dm => dm.id == id) ;
                if( index != -1 ){
                    item.items.splice(index,1);
                }
            });
        },
        //执行弹道队列
        _runTrajectoryQueue : function(){
            setTimeout(() => {this._runTrajectoryQueue();},this.ops.queueStep);
        },

        //创建弹幕
        _createDmItem(options){
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

                //是否圆角
                isradius : true ,

                //重要弹幕的显示位置  有值就代表是重要的
                specialPosition : null ,
                //特殊弹幕距离屏幕的间距距离
                specialDistance : 100 ,
                //特殊字幕的显示时间
                specialDuration : 4 ,

                _delay : 150 ,  //执行延迟的时间

                fontSize : "14px" ,
                fontColor : '#fff' ,
                delay: 0 , //是否延迟？
                repet : 1 , // 重复的次数

                //direction : 'right' ,  //left:从左到右   right：从右到左 。 暂不实现一般都是右向左
                position : 'top' ,   //top：顶部   bottom:底部   center：中间 ， free：全屏任意位置
                imgUrl:"" ,
            },options||{});

            //if( params.fontSize == "small" )  params.fontSize = "12px" ;
            //if( params.fontSize == "big" )  params.fontSize = "16px" ;


            var img = "" ;
            if( params.imgUrl ){img = '<img id="__img" src="'+params.imgUrl+'" >';}


            var item = document.createElement("div") ;
            item.className = "__guaguaBox" ;
            item.id = "__guaguaBox" ;
            item.setAttribute("cid" , options.id) ;
            item.innerHTML = img +
                            '<div class="__con">'+
                            options.message+
                            '</div>';

            this.wrapBox = document.body ;
            if( this.ops.elem ) {
                this.wrapBox = document.querySelector(this.ops.elem) ;
            }

            if( this.wrapBox ){
                var first = this.wrapBox.firstChild ;
                this.wrapBox.insertBefore(item,first);
                var itemParams = {
                    id : params.id ,
                    elem:item,
                    ops : params ,
                    config : this.ops ,
                    //guagua实例对象
                    queue : this
                }
                return new Item(itemParams);
            }else{
                throw new Error("elem没有找到：" + this.ops.elem) ;
                return null ;
            }

        } ,

        appendMessage : function(options){
            this._addTrajectory(this._createDmItem(options));
        }











    }


    win.Guagua = Guagua ;

})(window,document);