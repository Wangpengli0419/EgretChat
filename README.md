# **Egret搭建WebSocke简易聊天室**

本文，我们通过Egret和Node.js实现一个在线聊天室的demo。主要包括，聊天，改用户名，查看其他用户在线状态的功能。大致流程为，用户访问网页，即进入聊天状态，成为新游客，通过底部的输入框，可以输入自己想说的话，点击发布，信息呈现给所有在聊天的人的页面。用户可以实时修改自己的昵称，用户离线上线都会实时广播给其他用户！ 

体验链接 http://7hds.com:8888/

下图为最终制作完成的聊天面板

![](https://ws1.sinaimg.cn/large/005ADsFply1fukrs9fqmcj30af0ijt9t.jpg)

我们的WebSocket建立在Node.js之上，如果你对服务器技术非常熟悉，可以使用其他语言来编写WebSocket服务器。

在Node.js中我们使用ws第三方模块来实现服务器业务逻辑的快速搭建,还需使用uuid模块生成随机id，你需要使用npm包管理器来安装ws、uuid模块。使用以下命令：

```javascript
npm install ws -g
npm install uuid -g
```

来安装ws模块。安装完成之后，使用终端工具进入服务器的目录，开始编写代码：

```javascript
//引入ws模块
var WebSocket = require('ws');
//创建websocket服务，端口port为：****
var WebSocketServer = WebSocket.Server,
    wss = new WebSocketServer({port: 8180});
//引入uuid模块
var uuid = require('node-uuid');
//定义一个空数组，存放客户端的信息 
var clients = [];
//定义发送消息方法wsSend
//参数为 type:类型
//client_uuid:随机生成的客户端id
//nickname:昵称
//message:消息
//clientcount:客户端个数
function wsSend(type, client_uuid, nickname, message,clientcount) {
	//遍历客户端
  for(var i=0; i<clients.length; i++) {
  	//声明客户端
    var clientSocket = clients[i].ws;
    if(clientSocket.readyState === WebSocket.OPEN) {
    	//客户端发送处理过的信息
      clientSocket.send(JSON.stringify({
        "type": type,
        "id": client_uuid,
        "nickname": nickname,
        "message": message,
        "clientcount":clientcount,
      }));
    }
  }
}
//声明客户端index默认为1 
var clientIndex = 1;
//服务端连接
wss.on('connection', function(ws) {
//客户端client_uuid随机生成
  var client_uuid = uuid.v4();
  //昵称为游客+客户端index
  var nickname = "游客"+clientIndex;
  //client++
  clientIndex+=1;
  //将新连接的客户端push到clients数组中
  clients.push({"id": client_uuid, "ws": ws, "nickname": nickname});
  //控制台打印连接的client_uuid
  console.log('client [%s] connected', client_uuid);
 //声明连接信息为 昵称+来了
  // var connect_message = nickname + " 来了";
  var connect_message =  " 来了";

  //服务器广播信息 ***来了
  wsSend("notification", client_uuid, nickname, connect_message,clients.length);
 //当用户发送消息时
  ws.on('message', function(message) {
  	// 用户输入"/nick"的话为重命名消息
    if(message.indexOf('/nick') === 0) {
      var nickname_array = message.split(' ');
      if(nickname_array.length >= 2) {
        var old_nickname = nickname;
        nickname = nickname_array[1];
        var nickname_message = "用户 " + old_nickname + " 改名为： " + nickname;
        wsSend("nick_update", client_uuid, nickname, nickname_message,clients.length);
      }
    }//发送消息 
    else {
      wsSend("message", client_uuid, nickname, message,clients.length);
    }
  });
 //关闭socket连接时
  var closeSocket = function(customMessage) {
  	//遍历客户端
    for(var i=0; i<clients.length; i++) {
    	//如果客户端存在
        if(clients[i].id == client_uuid) {
        	// 声明离开信息
            var disconnect_message;
            if(customMessage) {
                disconnect_message = customMessage;
            } else {
                disconnect_message = nickname + " 走了";
            }
 		//客户端数组中删掉
          clients.splice(i, 1);
          //服务广播消息
          wsSend("notification", client_uuid, nickname, disconnect_message,clients.length);
        }
    }
  }
  ws.on('close', function() {
      closeSocket();
  });
 
  process.on('SIGINT', function() {
      console.log("Closing things");
      closeSocket('Server has disconnected');
      process.exit();
  });
});

```

服务器端主要是接收信息，判断是聊天信息还是重命名信息，然后发送广播。同时，当用户连接上服务器端或者关闭连接时，服务器也会发送广播通知其他用户。 

 我们封装了wsSend函数用来处理消息的广播。对每个连接的用户，我们默认给他分配为游客。为了实现广播，我们用clients数组来保存连接的用户。

将编写好的文件保存为server.js，在终端工具中，使用node server.js来启动你刚刚编写的服务器。如果终端没有报错，证明你的代码已经正常运行。

在实际项目中，我们的服务器逻辑远远比此示例复杂得多。服务器端完成后，再来编写客户端代码。

界面非常简单，我们通过两张图片来实现界面效果，首先创建我们的聊天界面，此项目中为了方便我们使用EUI进行快速开发。如下图：

![](https://ws1.sinaimg.cn/large/005ADsFply1fukruknl4uj30v20kat9n.jpg)

首先创建一个Image来放置我们的背景图。

创建三个Label对象，一个作为title：“多人在线聊天室”，一个作为提示：“当前在线人数”，还有一个id为lb_online的作为在线人数显示文本。

创建一个EditableText对象id为input_msg作为消息发送输入框，用户可以在此输入消息进行发送。

创建一个Button对象id为btn_ok，点击按钮可以执行发送消息动作。

创建界面的操作和WebSocket对象创建动作在同时进行，在init方法中创建WebSocket对象，并执行服务器连接操作，代码如下：

```javascript
	public ws;
	private init() {
		/**WebSocket连接 */
		this.ws = new WebSocket('ws://127.0.01:8180');
		this.ws.onopen = function (e) {
			console.log('Connection to server opened');
		}
    }
```

由于服务器开放了8180端口，我们也需要使用8180端口进行连接。当连接成功，可执行onopen方法。

服务器连接成功了，在控制台打印 'Connection to server opened'。

onmessage方法中读取服务器传递过来的数据，并通过appendLog方法将数据显示在对应的文本里，

使用newLabel方法并将一条新消息插入到消息框中。

```javascript
	private init() {
		/**WebSocket连接 */
		this.ws = new WebSocket('ws://127.0.01:8180');
		this.ws.onopen = function (e) {
			console.log('Connection to server opened');
		}
		/**昵称 */
		var nickname;
		var self = this;
		this.ws.onmessage = function (e) {
			var data = JSON.parse(e.data);
			nickname = data.nickname;
			appendLog(data.type, data.nickname, data.message, data.clientcount);
			console.log("ID: [%s] = %s", data.id, data.message);
			//插入消息
			self.group_msg.addChild(self.newLabel(data.nickname, data.message))
		}
		function appendLog(type, nickname, message, clientcount) {
			console.log(clientcount)
			/**聊天信息 */
			var messages = this.list_msg;
			/**提示 */
			var preface_label;
			if (type === 'notification') {
				preface_label = "提示：";
			} else if (type === 'nick_update') {
				preface_label = "警告：";
			} else {
				preface_label = nickname;
			}
			self.preface_label = preface_label;
			var message_text = self.message_text = message;
			/**在线人数 */
			self.lb_online.text = clientcount;
		}
		/**点击OK发送 */
		this.btn_ok.addEventListener(egret.TouchEvent.TOUCH_TAP, this.sendMessage, this);
	}
	private newLabel(name: string, msg: string) {
          var label1: eui.Label = new eui.Label();
          label1.text = name + ":" + msg;
          label1.textColor = 0x000000
          return label1;
	}
```

最后我们来编写发送消息的函数，在btn_ok中egret.TouchEvent.TOUCH_TAP点击之后的相应函数为sendMessage方法。

```javascript
	/**发送消息 */
	private sendMessage() {
		var message = this.input_msg.text;
		if (message.length < 1) {
			// console.log("不能发送空内容！");
			return;
		}
		this.ws.send(message);
		/**清空输入框内容 */
		this.input_msg.text = "";
	}
```

如果输入框中内容不为空的话就将数据通过  this.ws.send(message);  发送给服务器,并清除输入框的内容。

最终运行后，我们就可以实现多人在线聊天功能了。

完整版代码如下：

```javascript
class Chat extends eui.Component implements eui.UIComponent {
	/**在线人数文本 */
	public lb_online: eui.Label;
	/**聊天窗口 */
	public scr_msg: eui.Scroller;
	/**聊天信息 */
	public list_msg: eui.List;
	/**输入框 */
	public input_msg: eui.EditableText;
	/**确定按钮 */
	public btn_ok: eui.Button;
	/**聊天窗口消息组 */
	public group_msg: eui.Group;

	public constructor() {
		super();
	}
	protected partAdded(partName: string, instance: any): void {
		super.partAdded(partName, instance);
	}
	protected childrenCreated(): void {
		this.init();
		super.childrenCreated();
	}
	/**WebSocket */
	public ws;
	public preface_label;
	public message_text;
	private init() {
		/**WebSocket连接 */
         //线上测试链接，服务端代码需在服务器启动
		//this.ws = new WebSocket('ws://7hds.com:8180');
		this.ws = new WebSocket('ws://127.0.01:8180');
		this.ws.onopen = function (e) {
			console.log('Connection to server opened');
		}
		/**昵称 */
		var nickname;
		var self = this;
		this.ws.onmessage = function (e) {
			var data = JSON.parse(e.data);
			nickname = data.nickname;
			appendLog(data.type, data.nickname, data.message, data.clientcount);
			console.log("ID: [%s] = %s", data.id, data.message);
			//插入消息
			self.group_msg.addChild(self.newLabel(data.nickname, data.message))
		}
		function appendLog(type, nickname, message, clientcount) {
			console.log(clientcount)
			/**聊天信息 */
			var messages = this.list_msg;
			/**提示 */
			var preface_label;
			if (type === 'notification') {
				preface_label = "提示：";
			} else if (type === 'nick_update') {
				preface_label = "警告：";
			} else {
				preface_label = nickname;
			}
			self.preface_label = preface_label;
			var message_text = self.message_text = message;
			/**在线人数 */
			self.lb_online.text = clientcount;
		}
		/**点击OK发送 */
		this.btn_ok.addEventListener(egret.TouchEvent.TOUCH_TAP, this.sendMessage, this);
	}
	/**发送消息 */
	private sendMessage() {
		var message = this.input_msg.text;
		if (message.length < 1) {
			// console.log("不能发送空内容！");
			return;
		}
		this.ws.send(message);
		/**清空输入框内容 */
		this.input_msg.text = "";
		// console.log(this.ws.bufferedAmount);
	}
	private newLabel(name: string, msg: string) {
		var label1: eui.Label = new eui.Label();
		label1.text = name + ":" + msg;
		label1.textColor = 0x000000
		return label1;
	}

}
```



本文的demo增加了客户端与服务器的互动，同时也实现了客户端之间的联系。不管是功能还是代码，都有很多可以完善的地方，大家可以在此基础上，添加更多的功能。

 

 
