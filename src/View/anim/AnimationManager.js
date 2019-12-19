class AnimationManager {
	constructor() {
		this.animationManager = new Map();
		this.idGen = this.idMaker();
		this.gId = this.generateId.bind(this);
	}

	set(el, anim) {
		let animId = el.id, values = {};
		if (animId == null) {
			animId = 'anonymous';
		}
		animId += `_${this.gId()}`;

		if (this.animationManager.has(el)) {
			values = this.animationManager.get(el);
			values[`${animId}`] = anim;
		}
		else {
			values[`${animId}`] = anim;
		}

		this.animationManager.set(el, values);
	}

	delete(el) {
		this.animationManager.delete(el);
	}

	deleteAnim(el, animId) {
		if (this.animationManager.has(el)) {
			let values = this.animationManager.get(el);
			delete values[`${animId}`];
		}
	}

	cancelAll(el) {
		if (!this.animationManager.has(el)) { return; }

		const values = this.animationManager.get(el);
		const keys = Object.keys(values);

		for (let i = 0; i < keys.length; i++) {
			const anim = keys[i];
			if (!anim) { continue; }
			if(anim && typeof anim.cancel === 'function') {
				anim.cancel();
			}
		}
	}

	cancelAnimation(el, animId) {
		if (!this.animationManager.has(el)) { return; }

		const values = this.animationManager.get(el);
		const anim = values[`${animId}`];
		if(anim && typeof anim.cancel === 'function') {
			anim.cancel();
		}
	}

	pause(el, animId) {
		if (!this.animationManager.has(el)) { return; }

		const values = this.animationManager.get(el);
		const anim = values[`${animId}`];
		if(anim && typeof anim.pause === 'function') {
			anim.pause();
		}
	}

	play(el, animId) {
		if (!this.animationManager.has(el)) { return; }

		const values = this.animationManager.get(el);
		const anim = values[`${animId}`];
		if(anim && typeof anim.play === 'function') {
			anim.play();
		}
	}

	getAnimations(el) {
		if (!this.animationManager.has(el)) { return; }

		const values = this.animationManager.get(el);
		const keys = Object.keys(values);
		let r = [];
		for (let i = 0; i < keys.length; i++) {
			const anim = keys[i];
			if (!anim) { continue; }
			const obj = {
				animId: keys[i],
				anim,
			};
			r.push(obj);
		}

		return r;
	}

	finish(el, animId) {
		if (!this.animationManager.has(el)) { return; }

		const values = this.animationManager.get(el);
		const anim = values[`${animId}`];
		if(anim && typeof anim.finish === 'function') {
			anim.finish();
		}
	}

	getPlayState(el, animId) {
		if (!this.animationManager.has(el)) { return; }

		const values = this.animationManager.get(el);
		const anim = values[`${animId}`];
		if(anim) {
			return anim.playState;
		}
	}

	getPlayedTime(el, animId) {
		if (!this.animationManager.has(el)) { return; }

		const values = this.animationManager.get(el);
		const anim = values[`${animId}`];
		if(anim) {
			return anim.currentTime;
		}
	}

	generateId() {
		return this.idGen.next().value;
	}

	idMaker() {
		let index = 0;
		return {
			next: function () {
				return {
					value: index++,
					done: false,
				};
			},
		};
	}

}

export default AnimationManager;