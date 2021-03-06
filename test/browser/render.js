'use strict';
/* global describe, it, beforeEach */
let assert = require('assert');
let Cycle = require('../../');
let applyToDOM = require('./lib/apply-to-dom');
let Fixture89 = require('./fixtures/issue-89');
let {Rx, React} = Cycle;

function createRenderTarget() {
  let element = document.createElement('div');
  element.className = 'cycletest';
  document.body.appendChild(element);
  return element;
}

describe('applyToDOM', function () {
  beforeEach(function () {
    let testDivs = Array.prototype.slice.call(document.querySelectorAll('.cycletest'));
    testDivs.forEach(function (x) {
      if (x.remove) {
        x.remove();
      }
    });
  });

  it('should throw if definitionFn returns bad output', function () {
    assert.throws(function () {
      applyToDOM(createRenderTarget(), () => ({}));
    }, /definitionFn given to/);
  });

  it('should convert a simple <select> to DOM element', function () {
    let vtree$ = Rx.Observable.just(
      <select className="my-class">
        <option value="foo">Foo</option>
        <option value="bar">Bar</option>
        <option value="baz">Baz</option>
      </select>
    );
    applyToDOM(createRenderTarget(), () => vtree$);
    let selectEl = document.querySelector('.my-class');
    assert.notStrictEqual(selectEl, null);
    assert.notStrictEqual(typeof selectEl, 'undefined');
    assert.strictEqual(selectEl.tagName, 'SELECT');
  });

  it('should accept a ReactClass as definitionFn', function () {
    let MyElement = Cycle.component('MyElement', function () {
      return Rx.Observable.just(<h3 className="myelementclass" />);
    });
    applyToDOM(createRenderTarget(), MyElement);
    let myelement = document.querySelector('.myelementclass');
    assert.notStrictEqual(myelement, null);
    assert.notStrictEqual(typeof myelement, 'undefined');
    assert.strictEqual(myelement.tagName, 'H3');
  });

  it('should catch interaction events', function (done) {
    function computer(interactions) {
      interactions.get('click').subscribe(ev => {
        assert.strictEqual(ev.type, 'click');
        assert.strictEqual(ev.target.innerHTML, 'Foobar');
        done();
      });
      let vtree$ = Rx.Observable.just(
        <h3 className="myelementclass"
            onClick={interactions.listener('click')}>
          Foobar
        </h3>
      );
      return vtree$;
    }
    applyToDOM(createRenderTarget(), computer);
    // Make assertions
    let myElement = document.querySelector('.myelementclass');
    assert.notStrictEqual(myElement, null);
    assert.notStrictEqual(typeof myElement, 'undefined');
    assert.strictEqual(myElement.tagName, 'H3');
    assert.doesNotThrow(function () {
      myElement.click();
    });
  });

  it('should catch events from the inner span', function (done) {
    function computer(interactions) {
      interactions.get('spanClick').subscribe(function (ev) {
        assert.ok(/Wrapped by span/.test(ev.target.textContent));
        done();
      });
      return Rx.Observable.just(
        <div className="wrapperDiv"
             onClick={interactions.listener('spanClick')}>
          Wrapped by span
          <div className="innerDiv">Wrapped by div</div>
        </div>
      );
    }
    applyToDOM(createRenderTarget(), computer);
    let span = document.querySelector('.wrapperDiv > *:first-child');
    assert.notStrictEqual(span, null);
    assert.notStrictEqual(typeof span, 'undefined');
    assert.strictEqual(span.tagName, 'SPAN');
    assert.doesNotThrow(function () {
      span.click();
    });
  });

  it('should not set props.className to the root element', function () {
    let MyElement = Cycle.component('MyElement', Fixture89.myelement);
    let vtree$ = Rx.Observable.just(<MyElement className="ERR" />);
    applyToDOM(createRenderTarget(), () => vtree$);
    // Make assertions
    let myElement = document.querySelector('.myelementclass');
    assert.notStrictEqual(myElement, null);
    assert.notStrictEqual(typeof myElement, 'undefined');
    assert.strictEqual(myElement.className.indexOf('ERR'), -1);
  });

  it('should accept a view wrapping a custom element (#89)', function () {
    let MyElement = Cycle.component('MyElement', Fixture89.myelement);
    let number$ = Fixture89.makeModelNumber$();
    let vtree$ = Fixture89.viewWithContainerFn(number$, MyElement);
    applyToDOM(createRenderTarget(), () => vtree$);

    number$.request(1);
    let myelement1 = document.querySelector('.myelementclass');
    assert.notStrictEqual(myelement1, null);
    assert.strictEqual(myelement1.tagName, 'H3');
    assert.strictEqual(myelement1.innerHTML, '123');

    number$.request(1);
    let myelement2 = document.querySelector('.myelementclass');
    assert.notStrictEqual(myelement2, null);
    assert.strictEqual(myelement2.tagName, 'H3');
    assert.strictEqual(myelement2.innerHTML, '456');
  });

  it('should accept a view with custom element as the root of vtree$', function () {
    let MyElement = Cycle.component('MyElement', Fixture89.myelement);
    let number$ = Fixture89.makeModelNumber$();
    let vtree$ = Fixture89.viewWithoutContainerFn(number$, MyElement);
    assert.doesNotThrow(() => {
      applyToDOM(createRenderTarget(), () => vtree$);
      number$.request(1);
    });
  });
});
