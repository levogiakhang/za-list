export default function createCallbackPositionMemoizer() {
	let lastScrollTopPosition = 0;

	function invokeCallback(callback, ...params) {
		callback(...params);
	}

	function shouldInvokeCallback(scrollTopPosition) {
		return scrollTopPosition !== lastScrollTopPosition;
	}

	function positionMemoizer({position: scrollTopPosition, callback}, ...params) {
		let shouldInvoke = shouldInvokeCallback(scrollTopPosition);
		lastScrollTopPosition = scrollTopPosition;

		if (shouldInvoke) {
			invokeCallback(callback, ...params);
		}
	}

	return positionMemoizer;
}