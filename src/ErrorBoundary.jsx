import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props){
    super(props)
    this.state = { error: null, info: null }
  }

  componentDidCatch(error, info){
    console.error('ErrorBoundary caught', error, info)
    this.setState({ error, info })
  }

  render(){
    if(this.state.error){
      const { error, info } = this.state
      return (
        <div style={{padding:24, fontFamily:'Inter, system-ui, Arial', color:'#114B2B', background:'#f7efe1', minHeight:'100vh', boxSizing:'border-box'}}>
          <h2 style={{marginTop:0}}>Something went wrong</h2>
          <pre style={{whiteSpace:'pre-wrap', color:'#8b2f2f'}}>{String(error && error.toString())}</pre>
          <details style={{whiteSpace:'pre-wrap'}}>{info && info.componentStack}</details>
        </div>
      )
    }
    return (
      <>
        {this.props.children}
        {/* Debug badge to confirm React mounted (remove later) */}
        <div style={{position:'fixed', left:12, top:12, width:14, height:14, borderRadius:8, background:'#10b981', boxShadow:'0 4px 12px rgba(16,185,129,0.18)', zIndex:99999}} aria-hidden="true" />
      </>
    )
  }
}
