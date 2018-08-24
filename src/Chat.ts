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
		this.ws = new WebSocket('ws://7hds.com:8180');
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
	}
	private newLabel(name: string, msg: string) {
		var label1: eui.Label = new eui.Label();
		label1.text = name + ":" + msg;
		label1.textColor = 0x000000
		return label1;
	}

}