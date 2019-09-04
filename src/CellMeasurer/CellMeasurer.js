// @flow

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import ResizeObserver from 'resize-observer-polyfill';
import throttle from '../vendors/throttle';
import { THROTTLING_TIMER } from '../utils/value';
import { Position } from '../utils/types';
import CellMeasurerViewModel from '../ViewModel/CellMeasurerViewModel';

type OnChangedHeightCallback = any;

type CellMeasurerProps = {
  id: string,
  defaultHeight: number,
  position?: Position,
  isVirtualized: boolean,
  onChangedHeight: OnChangedHeightCallback,
}

export default class CellMeasurer extends React.PureComponent<CellMeasurerProps> {
  constructor(props) {
    super(props);
    this._cellMeasurer = undefined;
    this.resizeObserver = undefined;
    this.viewModel = undefined;
  }

  componentDidMount() {
    this._cellMeasurer = ReactDOM.findDOMNode(this);
    this.viewModel = new CellMeasurerViewModel(
      {
        node: this._cellMeasurer,
        props: this.props,
      });
    this.resizeObserver = new ResizeObserver(throttle(this.viewModel.onChildrenChangeHeight, THROTTLING_TIMER));
    this.resizeObserver.observe(this._cellMeasurer);
  }

  componentWillUnmount() {
    this.resizeObserver.disconnect(this._cellMeasurer);
  }

  render() {
    const {
      id,
      className,
      children,
      position: {top, left},
      isVirtualized,
    } = this.props;

    return (
      <div id={id}
           className={className}
           style={{
             display: 'block',
             position: isVirtualized ?
               'absolute' :
               'relative',
             top: top,
             left: left,
             overflow: 'auto',
             width: '100%',
           }}>
        {children}
      </div>
    );
  }
}