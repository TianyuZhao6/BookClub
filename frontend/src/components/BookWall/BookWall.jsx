import { useState } from 'react';
import './BookWall.css';
export default function BookWall({books,onSelect,paused=false}) {
 const [stopped,setStopped]=useState(false);
 const columns=Array.from({length:Math.min(4,books.length)},(_,i)=>books.filter((_,j)=>j%Math.min(4,books.length)===i));
 if(!books.length)return null;
 return <section className={'book-wall'+(paused||stopped?' is-paused':'')} aria-label='Scrolling book collection'>
  <div className='wall-controls'><a href='#browse-books'>Browse Books</a><button aria-pressed={stopped} onClick={()=>setStopped(value=>!value)}>{stopped?'Resume scrolling':'Pause scrolling'}</button></div>
  <div className='wall-columns'>{columns.map((column,i)=>{
   const entries=Array.from({length:Math.max(3,column.length)},(_,j)=>column[j%column.length]);
   return <div className='wall-column' key={i} data-testid={'book-column-'+i} style={{'--duration':(36+i*7)+'s'}}><div className='wall-track'>
    {[0,1].map(copy=><div className='wall-group' key={copy} aria-hidden={copy===1?'true':undefined}>{entries.map((book,j)=><button className='wall-book' key={j} tabIndex={copy===1||j>=column.length?-1:0} onClick={()=>onSelect(book)} aria-label={'Open '+book.title}>
     <img src={book.thumbnail||'/book-placeholder.svg'} alt='' onError={event=>{event.currentTarget.onerror=null;event.currentTarget.src='/book-placeholder.svg';}}/>
     <span>{book.title}<small>{(book.authors||[]).join(', ')}</small></span>
    </button>)}</div>)}
   </div></div>;
  })}</div>
  <p className='wall-hint'>Hover over a column to pause. Select a cover to explore.</p>
 </section>;
}
