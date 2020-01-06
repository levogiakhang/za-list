import React, { Component } from 'react';
import { Scrollbars } from 'react-custom-scrollbars';
import AutoSizer from 'react-virtualized-auto-sizer';
import Masonry from './Masonry';

class ListWrapper extends Component {
	constructor(props) {
		super(props);
		this.scrollbarSize = 12;
		this.scrollbarColor = '#cccccc';
		this.totalHeight = 1000;

		this.state = {
			isScrolling: false,
			scrollToOffset: 0,
		};
	}

	setTotalHeight(val) {
		if (typeof val === 'number') {
			this.totalHeight = val;
			this.forceUpdate();
		}
	}

	handleVirtualizedScroll(event) {
		if (event) {
			if (event.scrollTop != undefined) {
				console.log('handle Virtualized', event.scrollTop);
				if (this.customScrollBar && this.customScrollBar.container /* scrollbar  view */) {
					try {
						this._syncScroll = true;
						this.customScrollBar.scrollTop(event.scrollTop);
						if (this._syncScrollTimer) {
							clearTimeout(this._syncScrollTimer);
							this._syncScrollTimer = null;
						}
						this._syncScrollTimer = setTimeout(() => this._syncScroll = false, 400);
					}
					catch (e) {
						console.error(e);
					}
				}
				this.scrollOffset = event.scrollTop;
			}
			if (event.scrollHeight) {
				this.scrollHeight = event.scrollHeight;
			}
		}
		if (this.props.onScroll) {
			this.props.onScroll();
		}
	}

	handleCustomScroll(event) {
		if (event) {
			const {target} = event;
			if (!(target instanceof HTMLDivElement)) {
				return;
			}
			console.log('handle custom', target.scrollTop);
			this.setState({
				scrollToOffset: target.scrollTop,
			});
		}
	}

	render() {
		const {cellRender, width, height, viewModel, onLoadTop, onLoadBottom, scrollToIndex} = this.props;
		const { scrollToOffset} = this.state;
		return (
		  <AutoSizer>
			  {() => (
				<div style={{
					position: 'relative',
					overflowX: 'hidden',
					outline: 'none',
					height: `${height}px`,
					width: `${width}px`,
				}}>
					<Masonry ref={c => this.masonry = c}
					         style={{
						         position: 'absolute',
						         willChange: 'transform',
					         }}
					         id={'Masonry'}
					         viewModel={viewModel}
					         minWidth={200}
					         width={width}
					         height={height}
					         cellRenderer={cellRender}
					         scrollToAnim={'highlighted zoomScaling'}
					         additionAnim={'zoomIn'}
					         removalAnim={'zoomOut'}
					         timingResetAnimation={200}
					         isVirtualized={true}
					         overscanCount={3}
					         onLoadTop={onLoadTop}
					         onLoadBottom={onLoadBottom}
					         onScroll={this.handleVirtualizedScroll.bind(this)}
					         scrollToOffset={scrollToOffset}
					         scrollToIndex={scrollToIndex}
					         onChangeTotalHeight={this.setTotalHeight.bind(this)}
					         noHScroll/>
					<Scrollbars
					  id="conversationListScrollbar"
					  autoHide={true}
					  style={{
						  height: `${height}px`,
						  width: `${this.scrollbarSize}px`,
						  background: 'transparent',
						  zIndex: 2,
						  float: 'right',
						  marginRight: '2px',
					  }}
					  onScroll={this.handleCustomScroll.bind(this)}
					  ref={scrollbars => {
						  this.customScrollBar = scrollbars;
					  }}
					  renderThumbVertical={({style}) => <div
						style={{
							...style,
							backgroundColor: this.scrollbarColor,
							width: '8px',
							borderRadius: '3px',
						}}/>}
					>
						<div style={{
							height: this.totalHeight + 'px',
							width: 'auto',
						}}/>
					</Scrollbars>
				</div>
			  )}
		  </AutoSizer>
		);
	}
}

export default ListWrapper;