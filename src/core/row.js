import helper from './helper';
import { expr2expr } from './alphabet';

class Rows {
  constructor({ len, height }) {
    this._ = {};
    this.len = len;
    // default row height
    this.height = height;
  }

  getHeight(ri) {
    if (this.isHide(ri)) return 0;
    const row = this.get(ri);
    if (row && row.height) {
      return row.height;
    }
    return this.height;
  }

  setHeight(ri, v) {
    const row = this.getOrNew(ri);
    row.height = v;
  }

  unhide(idx) {
    let index = idx;
    while (index > 0) {
      index -= 1;
      if (this.isHide(index)) {
        this.setHide(index, false);
      } else break;
    }
  }

  isHide(ri) {
    const row = this.get(ri);
    return row && row.hide;
  }

  setHide(ri, v) {
    const row = this.getOrNew(ri);
    if (v === true) row.hide = true;
    else delete row.hide;
  }

  setStyle(ri, style) {
    const row = this.getOrNew(ri);
    row.style = style;
  }

  sumHeight(min, max, exceptSet) {
    return helper.rangeSum(min, max, (i) => {
      if (exceptSet && exceptSet.has(i)) return 0;
      return this.getHeight(i);
    });
  }

  totalHeight() {
    return this.sumHeight(0, this.len);
  }

  get(ri) {
    return this._[ri];
  }

  getOrNew(ri) {
    this._[ri] = this._[ri] || { cells: {} };
    return this._[ri];
  }

  getCell(ri, ci) {
    const row = this.get(ri);
    if (row !== undefined && row.cells !== undefined && row.cells[ci] !== undefined) {
      return row.cells[ci];
    }
    return null;
  }

  getCellMerge(ri, ci) {
    const cell = this.getCell(ri, ci);
    if (cell && cell.merge) return cell.merge;
    return [0, 0];
  }

  getCellOrNew(ri, ci) {
    const row = this.getOrNew(ri);
    row.cells[ci] = row.cells[ci] || {};
    return row.cells[ci];
  }

  // what: all | text | format | rotate-paste
  setCell(ri, ci, cell, what = 'all') {
    const row = this.getOrNew(ri);
    if (what === 'all' || what === 'rotate-paste') {
      row.cells[ci] = cell;
    } else if (what === 'text') {
      row.cells[ci] = row.cells[ci] || {};
      row.cells[ci].text = cell.text;
    } else if (what === 'format') {
      row.cells[ci] = row.cells[ci] || {};
      row.cells[ci].style = cell.style;
      if (cell.merge) row.cells[ci].merge = cell.merge;
    }
  }

  setCellText(ri, ci, text) {
    const cell = this.getCellOrNew(ri, ci);
    if (cell.editable !== false) cell.text = text;
  }

  // what: all | format | text | rotate-paste
  copyPaste(srcCellRange, dstCellRange, what, autofill = false, cb = () => { }) {
    const {
      sri, sci, eri, eci,
    } = srcCellRange;
    const dsri = dstCellRange.sri;
    const dsci = dstCellRange.sci;
    const deri = dstCellRange.eri;
    const deci = dstCellRange.eci;
    const [rn, cn] = srcCellRange.size();
    const [drn, dcn] = dstCellRange.size();
    // console.log(srcIndexes, dstIndexes);
    let isAdd = true;
    let dn = 0;
    if (deri < sri || deci < sci) {
      isAdd = false;
      if (deri < sri) dn = drn;
      else dn = dcn;
    }

    const ncellList = [];
    // ncellListを作成する為のループ
    // 複数行分ループを回す
    // コピー元:開始座標(行) <= コピー元:選択座標(行)
    for (let i = sri; i <= eri; i += 1) {
      // i = 行数分(コピー元)
      // j = 列数分(コピー元)
      // ii = 行数分(コピー先)
      // jj = 列数分(コピー先)

      // コピー元データのセル値(行単位の配列)
      if (this._[i]) {

        // 配列の数分だけループを回す
        // コピー元:開始座標(列) <= コピー元:選択座標(列)
        for (let j = sci; j <= eci; j += 1) {

          // 値チェック
          if (this._[i].cells && this._[i].cells[j]) {

            // 複数行分ループを回す
            // コピー先:開始座標(行) <= コピー先:選択座標(行)
            for (let ii = dsri; ii <= deri; ii += rn) {

              // 複数列分ループを回す
              // コピー先:開始座標 <= コピー先:選択座標
              for (let jj = dsci; jj <= deci; jj += cn) {
                let nri = 0;
                let nci = 0;
                if (what == "rotate-paste") {
                  // 転置して貼り付け
                  nri = ii + (j - sci);
                  nci = jj + (i - sri);
                } else {
                  nri = ii + (i - sri);
                  nci = jj + (j - sci);
                }
                // console.log("ii:", ii, "i:", i, "sci:", sri)
                // console.log("jj:", jj, "j:", j, "sci:", sci)
                // console.log("nri:", nri)
                // console.log("nci:", nci)
                // const ncell = helper.cloneDeep(this._[i].cells[j]);
                // const ncell = JSON.parse(JSON.stringify(helper.cloneDeep(this._[i].cells[j])));
                const ncell = helper.cloneDeep(this._[i].cells[j]);
                ncellList.push(ncell);
              }
            }
          }
        }
      }
    }

    // ncellListを作成する為のループと同じ条件でループして、ncellListを対象セルへ反映
    let ncellListIdx = 0;
    for (let i = sri; i <= eri; i += 1) {
      // i = 行数分(コピー元)
      // j = 列数分(コピー元)
      // ii = 行数分(コピー先)
      // jj = 列数分(コピー先)

      // コピー元データのセル値(行単位の配列)
      if (this._[i]) {

        // 配列の数分だけループを回す
        // コピー元:開始座標(列) <= コピー元:選択座標(列)
        for (let j = sci; j <= eci; j += 1) {

          // 値チェック
          if (this._[i].cells && this._[i].cells[j]) {

            // 複数行分ループを回す
            // コピー先:開始座標(行) <= コピー先:選択座標(行)
            for (let ii = dsri; ii <= deri; ii += rn) {

              // 複数列分ループを回す
              // コピー先:開始座標 <= コピー先:選択座標
              for (let jj = dsci; jj <= deci; jj += cn) {
                let nri = 0;
                let nci = 0;
                if (what == "rotate-paste") {
                  // 転置して貼り付け
                  nri = ii + (j - sci);
                  nci = jj + (i - sri);
                } else {
                  nri = ii + (i - sri);
                  nci = jj + (j - sci);
                }
                // console.log("ii:", ii, "i:", i, "sci:", sri)
                // console.log("jj:", jj, "j:", j, "sci:", sci)
                // console.log("nri:", nri)
                // console.log("nci:", nci)
                // const ncell = helper.cloneDeep(this._[i].cells[j]);
                const ncell = ncellList[ncellListIdx];
                ncellListIdx++;

                // ncell.text
                if (autofill && ncell && ncell.text && ncell.text.length > 0) {
                  const { text } = ncell;
                  let n = (jj - dsci) + (ii - dsri) + 2;
                  if (!isAdd) {
                    n -= dn + 1;
                  }
                  if (text[0] === '=') {
                    ncell.text = text.replace(/[a-zA-Z]{1,3}\d+/g, (word) => {
                      let [xn, yn] = [0, 0];
                      if (sri === dsri) {
                        xn = n - 1;
                        // if (isAdd) xn -= 1;
                      } else {
                        yn = n - 1;
                      }
                      if (/^\d+$/.test(word)) return word;
                      return expr2expr(word, xn, yn);
                    });
                  } else if ((rn <= 1 && cn > 1 && (dsri > eri || deri < sri))
                    || (cn <= 1 && rn > 1 && (dsci > eci || deci < sci))
                    || (rn <= 1 && cn <= 1)) {
                    const result = /[\\.\d]+$/.exec(text);
                    // console.log('result:', result);
                    if (result !== null) {
                      const index = Number(result[0]) + n - 1;
                      ncell.text = text.substring(0, result.index) + index;
                    }
                  }
                }
                this.setCell(nri, nci, ncell, what);
                cb(nri, nci, ncell);
              }
            }
          }
        }
      }
    }
  }

  cutPaste(srcCellRange, dstCellRange) {
    const ncellmm = {};
    this.each((ri) => {
      this.eachCells(ri, (ci) => {
        let nri = parseInt(ri, 10);
        let nci = parseInt(ci, 10);
        if (srcCellRange.includes(ri, ci)) {
          nri = dstCellRange.sri + (nri - srcCellRange.sri);
          nci = dstCellRange.sci + (nci - srcCellRange.sci);
        }
        ncellmm[nri] = ncellmm[nri] || { cells: {} };
        ncellmm[nri].cells[nci] = this._[ri].cells[ci];
      });
    });
    this._ = ncellmm;
  }

  // src: Array<Array<String>>
  paste(src, dstCellRange) {
    if (src.length <= 0) return;
    const { sri, sci } = dstCellRange;
    src.forEach((row, i) => {
      const ri = sri + i;
      row.forEach((cell, j) => {
        const ci = sci + j;
        this.setCellText(ri, ci, cell);
      });
    });
  }

  insert(sri, n = 1) {
    const ndata = {};
    this.each((ri, row) => {
      let nri = parseInt(ri, 10);
      if (nri >= sri) {
        nri += n;
        this.eachCells(ri, (ci, cell) => {
          if (cell.text && cell.text[0] === '=') {
            cell.text = cell.text.replace(/[a-zA-Z]{1,3}\d+/g, word => expr2expr(word, 0, n, (x, y) => y >= sri));
          }
        });
      }
      ndata[nri] = row;
    });
    this._ = ndata;
    this.len += n;
  }

  insertCell(sri, sci, n = 1) {
    const ndata = {};
    this.each((ri, row) => {
      let nri = parseInt(ri, 10);
      if (!ndata[nri]) {
        ndata[nri] = {cells: {}};
      }
      const colIdxStrs = Object.keys(row.cells);
      const colIdxlength = colIdxStrs.length;
      for (let i = 0; i < colIdxlength; i++) {
        const colIdxStr = colIdxStrs[i];
        const colIdx = parseInt(colIdxStr, 10);
        let adjustRowIdx = 0;
        if (nri >= sri && colIdx == sci) {
          adjustRowIdx = n;
          if (!ndata[nri+adjustRowIdx]) {
            ndata[nri+adjustRowIdx] = {cells: {}};
          }
        }
        ndata[nri+adjustRowIdx].cells[colIdxStr] = row.cells[colIdxStr];
      }
    });
    this._ = ndata;
    this.len += n;
  }

  delete(sri, eri) {
    const n = eri - sri + 1;
    const ndata = {};
    this.each((ri, row) => {
      const nri = parseInt(ri, 10);
      if (nri < sri) {
        ndata[nri] = row;
      } else if (ri > eri) {
        ndata[nri - n] = row;
        this.eachCells(ri, (ci, cell) => {
          if (cell.text && cell.text[0] === '=') {
            cell.text = cell.text.replace(/[a-zA-Z]{1,3}\d+/g, word => expr2expr(word, 0, -n, (x, y) => y > eri));
          }
        });
      }
    });
    this._ = ndata;
    this.len -= n;
  }

  deleteCell_(sri, eri, sci) {
    const n = eri - sri + 1;
    const ndata = {};
    this.each((ri, row) => {
      const nri = parseInt(ri, 10);
      if (!ndata[nri]) {
        ndata[nri] = {cells: {}};
      }
      const colIdxStrs = Object.keys(row.cells);
      const colIdxlength = colIdxStrs.length;
      for (let i = 0; i < colIdxlength; i++) {
        const colIdxStr = colIdxStrs[i];
        const colIdx = parseInt(colIdxStr, 10);
        let adjustRowIdx = 0;
        if (ri > eri && colIdx == sci) {
          adjustRowIdx = n;
          if (!ndata[nri+adjustRowIdx]) {
            ndata[nri+adjustRowIdx] = {cells: {}};
          }
        }
        ndata[nri+adjustRowIdx].cells[colIdxStr] = row.cells[colIdxStr];
      }
    });
    this._ = ndata;
    this.len -= n;
  }

  insertColumn(sci, n = 1) {
    this.each((ri, row) => {
      const rndata = {};
      this.eachCells(ri, (ci, cell) => {
        let nci = parseInt(ci, 10);
        if (nci >= sci) {
          nci += n;
          if (cell.text && cell.text[0] === '=') {
            cell.text = cell.text.replace(/[a-zA-Z]{1,3}\d+/g, word => expr2expr(word, n, 0, x => x >= sci));
          }
        }
        rndata[nci] = cell;
      });
      row.cells = rndata;
    });
  }

  deleteColumn(sci, eci) {
    const n = eci - sci + 1;
    this.each((ri, row) => {
      const rndata = {};
      this.eachCells(ri, (ci, cell) => {
        const nci = parseInt(ci, 10);
        if (nci < sci) {
          rndata[nci] = cell;
        } else if (nci > eci) {
          rndata[nci - n] = cell;
          if (cell.text && cell.text[0] === '=') {
            cell.text = cell.text.replace(/[a-zA-Z]{1,3}\d+/g, word => expr2expr(word, -n, 0, x => x > eci));
          }
        }
      });
      row.cells = rndata;
    });
  }

  // what: all | text | format | merge
  deleteCells(cellRange, what = 'all') {
    cellRange.each((i, j) => {
      this.deleteCell(i, j, what);
    });
  }

  // what: all | text | format | merge
  deleteCell(ri, ci, what = 'all') {
    const row = this.get(ri);
    if (row !== null) {
      const cell = this.getCell(ri, ci);
      if (cell !== null && cell.editable !== false) {
        if (what === 'all') {
          delete row.cells[ci];
        } else if (what === 'text') {
          if (cell.text) delete cell.text;
          if (cell.value) delete cell.value;
        } else if (what === 'format') {
          if (cell.style !== undefined) delete cell.style;
          if (cell.merge) delete cell.merge;
        } else if (what === 'merge') {
          if (cell.merge) delete cell.merge;
        }
      }
    }
  }

  maxCell() {
    const keys = Object.keys(this._);
    const ri = keys[keys.length - 1];
    const col = this._[ri];
    if (col) {
      const { cells } = col;
      const ks = Object.keys(cells);
      const ci = ks[ks.length - 1];
      return [parseInt(ri, 10), parseInt(ci, 10)];
    }
    return [0, 0];
  }

  each(cb) {
    Object.entries(this._).forEach(([ri, row]) => {
      cb(ri, row);
    });
  }

  eachCells(ri, cb) {
    if (this._[ri] && this._[ri].cells) {
      Object.entries(this._[ri].cells).forEach(([ci, cell]) => {
        cb(ci, cell);
      });
    }
  }

  setData(d) {
    if (d.len) {
      this.len = d.len;
      delete d.len;
    }
    this._ = d;
  }

  getData() {
    const { len } = this;
    return Object.assign({ len }, this._);
  }
}

export default {};
export {
  Rows,
};
