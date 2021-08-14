import '../css/mock.css';
import React from 'react';

export default class FetchComponent extends React.Component {
  constructor(props) {
    super(props);
    this.url = 'https://jsonplaceholder.typicode.com/todos/1?t=fetch';
    this.state = {
      result: '',
    };
    this.click = this.click.bind(this);
  }

  // @autobind
  click() {
    fetch(this.url).then(res => {
      console.log('fetch result:', res);
      console.log('fetch header:', [...res.headers.entries()]);
      res.json().then((json) => {
        this.setState({result: JSON.stringify(json, null, 2)});
      });
    }).catch(err => {
      console.log('error:', err);
      this.setState({result: err.message});
    });
  }

  render() {
    return (
      <div className="request">
        <button onClick={ this.click }>Request By Fetch</button>
        <div className="input">
          URL: <input className="input" type="text" value={this.url} readOnly />
        </div>
        <pre className="result">{this.state.result}</pre>
      </div>
    );
  }
}
