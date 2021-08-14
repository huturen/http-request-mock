import '../css/mock.css';
import React from 'react';
import axios from 'axios';

export default class XhrComponent extends React.Component {
  constructor(props) {
    super(props);
    this.url = 'https://jsonplaceholder.typicode.com/todos/1?t=xhr';

    this.state = {
      result: '',
    };
    this.click = this.click.bind(this);
  }

  // @autobind
  click() {
    axios.get(this.url).then(res => {
      console.log('xhr result:', res);
      console.log('xhr header:', res.headers);
      this.setState({
        result: typeof res.data === 'object'
          ? JSON.stringify(res.data, null, 2)
          : res.data
      });
    }).catch(err => {
      console.log('error:', err);
      this.setState({result: err.message});
    });
  }

  render() {
    return (
      <div className="request">
        <button onClick={ this.click }>Request By XMLHttpRequest</button>
        <div className="input">
          URL: <input className="input" type="text" value={this.url} readOnly />
        </div>
        <pre className="result">{this.state.result}</pre>
      </div>
    );
  }
}
