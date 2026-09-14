import './BookDescription.css';
import Rating from '@mui/material/Rating';

const BookDescription = (props) => {

    return (
        <div className="book-description">
            <div>
                <br />
                <div className="title">
                    {props.title}
                </div>

                <div className="author">
                    {props.author}
                </div>

                <div className="genres">
                    {props.genres && props.genres.map((genre) => {
                        return <div className='genre' key={genre}>{genre}</div>
                    })}
                </div>
                <br />

                <div className="description">
                    {props.description}
                </div>

                <div className='ratings-div'>
                   {!props.errorMessage && <Rating name="read-only" value={props.rating} readOnly />}
                </div>
                <div className='ratings-error-div'>
                    {props.errorMessage ? <div>{props.errorMessage}</div> : <div>Based on {props.ratingCount} ratings</div>}
                </div>
            </div>
        </div >
    )
}

export default BookDescription