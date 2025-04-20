import axios from "axios";
import { createContext, useEffect, useState } from "react";
import { toast } from "react-toastify";

export {creatContext} from "react";

export const AppContext = createContext();

axios.defaults.withCredentials = true;

export const AppContextProvider = (props)=>{
    const backendUrl = import.meta.env.VITE_BACKEND_URL
    console.log(backendUrl)
    const [isLoggedin ,setIsLoggedin] = useState(false);
    const [userData ,setUserData] = useState(false);
    

    const getUserData = async ()=>{
        try {
            const {data} = await axios.get(backendUrl + '/api/user/data')
            console.log(data);
            data.success ? setUserData(data.userData) : toast.error(data.message)
        } catch (error) {
            toast.error(data.message)
        }
    }

    const getAuthState = async () =>{
        try {
            const {data} = await axios.get(backendUrl +'/api/auth/is-auth')
            
            if (data.success) {
                setIsLoggedin(true)
                getUserData()
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    useEffect(()=>{
        getAuthState()
    },[])

    const value = {
        backendUrl,
        isLoggedin,
        setIsLoggedin,
        userData,
        setUserData,
        getUserData
        
    }

    
    return (
        <AppContext.Provider value={value}>
            {props.children}
        </AppContext.Provider>
    )
}
