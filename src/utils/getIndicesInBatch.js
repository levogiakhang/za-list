import { SCROLL_DIRECTION_FORWARD } from './value';

const prevCount = 1;

export default function getIndicesInBatch({scrollDirection, currentIndex, numOfItemInViewport, overscanCount, totalItems}) {
	let indices = {
		startIndex: 0,
		endIndex: 0,
	};

	if (scrollDirection === SCROLL_DIRECTION_FORWARD) {
		indices.startIndex = Math.max(0, currentIndex - prevCount) || 0;
		indices.endIndex = Math.min(totalItems - 1, currentIndex + numOfItemInViewport + overscanCount) || 0;
		return indices;
	}
	else {
		indices.startIndex = Math.max(0, currentIndex - overscanCount) || 0;
		indices.endIndex = Math.min(totalItems - 1, currentIndex + numOfItemInViewport) || 0;
		return indices;
	}
}