class CellMeasurerViewModel {
  constructor({node: cellMeasurer, props}) {
    this.cellMeasurer = cellMeasurer;
    this.props = props;

    this.isFirst = true;
    this._oldHeight = this.props.defaultHeight;
    this._newHeight = undefined;
    this.onChildrenChangeHeight = this.onChildrenChangeHeight.bind(this);
  }

  onChildrenChangeHeight() {
    if (this._isChangedHeight() || this.isFirst) {
      const oldHeightCache = this._oldHeight;
      this._oldHeight = this._newHeight;
      this.props.onChangedHeight(this.props.id, oldHeightCache, this._newHeight);
    }
  };

  _isChangedHeight() {
    if (this._newHeight !== undefined) {
      this.isFirst = false;
    }
    this._newHeight = this._getCellHeight();
    return this._oldHeight !== this._newHeight;
  }

  _getCellHeight() {
    if (
      this.cellMeasurer &&
      this.cellMeasurer.ownerDocument &&
      this.cellMeasurer.ownerDocument.defaultView &&
      this.cellMeasurer instanceof this.cellMeasurer.ownerDocument.defaultView.HTMLElement
    ) {
      return Math.round(this.cellMeasurer.offsetHeight);
    }
  }
}

export default CellMeasurerViewModel;