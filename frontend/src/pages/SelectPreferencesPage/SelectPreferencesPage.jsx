import { useEffect, useState, useContext } from "react"
import { Navigate } from 'react-router-dom';
import { Alert } from 'react-bootstrap';
import { getPreferencesByUsername, setPreferencesByUsername } from "../../api/userAPI"
import UserContext from '../../user/UserContext';


import "./SelectPreferencesPage.css"

const SelectPreferencesPage = () => {
    const { username } = useContext(UserContext);



    useEffect(() => {
        let active = true;
        getPreferencesByUsername(username).then(response => {
            if (!active) return;
            if (response.error) setErrorMsg(response.error);
            else setSelectedGenres(response.data);
        });
        return () => { active = false; };
    }, [username]);

    const [selectedGenres, setSelectedGenres] = useState([])
    const [successMsg, setSuccessMsg] = useState("")
    const [errorMsg, setErrorMsg] = useState("")


    const possibleGenres = [
        "Adventure",
        "Sci-Fi",
        "History",
        "War",
        "Canada",
        "Action",
        "Autobiography",
        "Anthology",
        "Biography",
        "Business",
        "Classic",
        "Cookbook",
        "Crime",
        'Drama',
        "Fairytale",
        "Fantasy",
        "Humor",
        "Horror",
        "Journal",
        "Mystery",
        "Math",
        "Philosophy",
        "Poetry",
        "Prayer",
        "Politics",
        "Religion",
        "Romance",
        "Satire",
        "True crime",
        "Science fiction",
        "Short story",
        "Science",
        "Suspense",
        "Western",
        "Young adult"]

    const setSelected = (genre) => {
        return selectedGenres.includes(genre)
    }

    const displayGenres = possibleGenres.map((genre, index) => {
        return <div onClick={() => {
            if (selectedGenres.includes(genre)) {
                setSelectedGenres(selectedGenres.filter(allgenre => {
                    return allgenre !== genre
                }))
            } else {
                setSelectedGenres([...selectedGenres, genre])
            }
        }
        } className={`possible-genre ${setSelected(genre) ? "selected-genre" : ""}`} key={index}>{genre}</div>
    })

    const setUserGenres = async () => {

        if (selectedGenres.length < 5) {
            setErrorMsg("You must select at least 5 genres")
            return
        }

        const body = {
            preferences: selectedGenres
        }

        const response = await setPreferencesByUsername(username, body)
        if (response.error) { setErrorMsg(response.error); return; }
        setErrorMsg("");
        setSuccessMsg("Success")
    }

    return (<div>
        <h1 className="genres-title">Select your favourite genres</h1>
        {errorMsg !== "" && <Alert variant="danger" style={{ "marginRight": 120, "marginLeft": 120 }} key={errorMsg}>{errorMsg}</Alert>}
        <div className="genres">
            {displayGenres}
        </div>
        <div className="center">
            <button className="possible-genre" onClick={setUserGenres}>Set Genres</button>
        </div>
        {successMsg !== "" && <Navigate to="/myAccount" />}
    </div>)
}

export default SelectPreferencesPage