import type { NextPage, GetServerSideProps } from 'next'
import axios from 'axios'
import Image from 'next/image'
import { useState, useEffect } from 'react'

import styles from '../../styles/scss/ReportedPosts/RContainer.module.scss'
import { useAuth } from '../../utils/useAuth'
import { server } from '../../config/server'
import GoogleInput from '../../components/CreateMod/GoogleInput'
import ReportedComment from '../../components/ReportedComments/ReportedComment'

interface Posts {
    _comments: any;
    _coming: boolean;
}

const ReportedPosts: NextPage<Posts> = ({ _comments, _coming }) => {
    const auth = useAuth()

    const [ coming, setComing ] = useState(_coming)
    const [ isLocationChanged, setIsLocationChanged ] = useState(false)
    const [ isComuna, setIsComuna ] = useState(false)
    const [ comments, setComments ] = useState(_comments || [])
    const [ search, setSearch ] = useState<boolean | null>(null)
    const [ fullExactPosition, setFullExactPosition ] = useState<any>()
    const [ location, setLocation ] = useState('')
    const [ errorLocation, setErrorLocation ] = useState(false)
    const [ loading, setLoading ] = useState(false)
    const [ more, setMore ] = useState(0)
    const [ isComunaName, setIsComunaName ] = useState(false)
    const [ searchedName, setSearchedName ] = useState('Toate')

    const [ url, setUrl ] = useState(`${server}/api/sd/post/get-reported-comments?level=all&skip=0`)

    //For changing location and for managing the addition of other mods when there are too many to show at once
    useEffect(() => {
        if(search === null) return;
        let locationError = false;
        setErrorLocation(false)
        setLoading(true)

        if(location === '') {
            if(isLocationChanged) {
                setMore(0)
            }

            if(isComuna) {
                setErrorLocation(true)
                setLoading(false)
                return;
            }
            
            const getNewModerators = async () => {
                const result = await axios.get(`${server}/api/sd/post/get-reported-comments?level=all&skip=${isLocationChanged ? 0 : more}`, { withCredentials: true })
                                        .then(res => res.data)
                                        .catch(err => {
                                            console.log(err)
                                            setErrorLocation(true)
                                            setLoading(false)
                                        })
    
                if(result) {                            
                    if(isLocationChanged) {
                        setComments(result.comments)
                    } else {
                        const newComments: any = [...comments, ...result.comments]
                        setComments(newComments)
                    }

                    setComing(result.coming)
                    setLoading(false)
                    setSearchedName('Toate')
                    setUrl(`${server}/api/sd/post/get-reported-comments?level=all&skip=0`)
                }

                setIsComunaName(false)
                setIsLocationChanged(false)
            }
    
            getNewModerators()
            return;
        }

        if(!fullExactPosition || (fullExactPosition.address_components && fullExactPosition.address_components.length <= 0) || fullExactPosition.name !== location) {
            setErrorLocation(true)
            locationError = true
            setLoading(false)
            return;
        }

        let county: any = [];
        if(fullExactPosition && fullExactPosition.address_components) {
            for(let i = 0; i < fullExactPosition.address_components.length; i++) {
                if(fullExactPosition.address_components[i].types.includes('administrative_area_level_1')) {
                    for(let j = 0; j < (fullExactPosition.address_components[i].long_name.split(' ').length > 1 ? fullExactPosition.address_components[i].long_name.split(' ').length - 1 :  fullExactPosition.address_components[i].long_name.split(' ').length); j++){
                        county = [ ...county, fullExactPosition.address_components[i].long_name.split(' ')[j] ]
                    }
                    county = county.join(" ")
                    break;
                }
                if(i === fullExactPosition.address_components.length - 1) {
                    setErrorLocation(true)
                    locationError = true
                }
            }
        } else {
            setErrorLocation(true)
            locationError = true
        }
    
        let comuna: any = [];
        if(fullExactPosition && fullExactPosition.address_components) {
            for(let i = 0; i < fullExactPosition.address_components.length; i++) {
                if(fullExactPosition.address_components[i].types.includes('administrative_area_level_2')) {
                    for(let j = 0; j < fullExactPosition.address_components[i].long_name.split(' ').length; j++){
                        comuna = [ ...comuna, fullExactPosition.address_components[i].long_name.split(' ')[j] ]
                    }
                    comuna = comuna.join(" ")
                    break;
                }
            }
        }

        let isWithoutCity = false, city = location;
        for(let i = 0; i < fullExactPosition.address_components.length; i++) {
            if(fullExactPosition.address_components[i].types.includes('locality')) {
                break;
            } else if(i === fullExactPosition.address_components.length - 1) {
                isWithoutCity = true
                city = ''
            }
        }
    
        if(Array.isArray(comuna)) {
            comuna = ''
        }

        if(comuna === '' && isComuna) {
            setErrorLocation(true)
            setLoading(false)
            return;
        }

        const getNewModerators = async (county: string, comuna: string, location: string, city: string) => {
            if(isLocationChanged) {
                setMore(0)
            }

            let specialName = false
            if(isComuna) {
                setIsComunaName(true)
                specialName = true
            } else setIsComunaName(false)

            const result = await axios.get(`${server}/api/sd/post/get-reported-comments?county=${county}&comuna=${comuna}&location=${isWithoutCity ? '' : location}&all=false&isComuna=${isComuna ? 'true' : 'false'}&skip=${ isLocationChanged ? 0 : more }`, { withCredentials: true })
                                    .then(res => res.data)
                                    .catch(err => {
                                        console.log(err)
                                        setErrorLocation(true)
                                        setLoading(false)
                                    })

            if(result) {
                if(isLocationChanged) {
                    setComments(result.posts)
                } else {
                    const newComments: any = [...comments, ...result.comments]
                    setComments(newComments)
                }

                setUrl(`${server}/api/sd/post/get-reported-comments?county=${county}&comuna=${comuna}&location=${isWithoutCity ? '' : location}&all=false&isComuna=${isComuna ? 'true' : 'false'}&skip=0`)
                setLoading(false)
                setSearchedName(`${county} County${comuna !== '' ? `, ${comuna}${(!isComunaName && !specialName) ? `, ${city}` : ''}` : ((city !== '' && !isComunaName && !specialName) ?  `, ${city}` : '')}`)
            }
            
            setComing(result.coming)
            setIsLocationChanged(false)
        }

        if(!locationError) {
            getNewModerators(county, comuna, location, city)
        } else setLoading(false)

        setIsLocationChanged(false)
    }, [search, more])

    return (
        <>
            <div style={{ paddingBottom: 50 }}> 
                {((auth.type === 'General' || auth.type === 'Judetean' || auth.type === 'Comunal') || !auth.done) &&
                    <div className={styles.fcontainer}>
                        <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                            <h2>Postări: {comments ? comments.length : 0}</h2>
                            <div style={{ width: '40%', position: 'absolute', right: 0, display: 'flex', alignItems: 'center', gap: '1em' }}>
                                <GoogleInput isComuna={isComuna} setIsComuna={setIsComuna} index={2} setFullExactPosition={setFullExactPosition} location={location} setLocation={setLocation} error={errorLocation} setError={setErrorLocation} />
                                <div className={styles.button_search}>
                                    <button onClick={() => { setIsLocationChanged(true); setSearch(!search); } }>Caută</button>
                                </div>
                            </div>
                        </div>  
                    </div>
                }
                <div className={styles.results_headline}>
                    <h1>Rezultate pentru: {searchedName}</h1>
                </div>
            </div>

            {!loading ?
                    <>
                        {(comments.length > 0) ?
                            <div className={styles.container_moderators}>
                                {comments.map((comment: any, index: number) => {
                                    return <ReportedComment key={index} index={index} _id={comment._id} originalPostId={comment.originalPostId} authorId={comment.authorId} nameAuthor={comment.nameAuthor} 
                                                         city={comment.city} county={comment.county} text={comment.text} downVoted={comment.downVoted} upVoted={comment.upVoted} reports={comment.reported}
                                                         firstNameAuthor={comment.firstNameAuthor} creationDate={comment.creationDate} authorProfilePicture={comment.profilePicture} url={url} 
                                                         setSearch={setSearch} search={search} setIsLocationChanged={setIsLocationChanged} />
                                })}
                            </div>
                            :
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', gap: '2em', marginTop: 50 }}>
                                    <Image src='https://res.cloudinary.com/multimediarog/image/upload/v1650708973/FIICODE/no-data-7713_1_s16twd.svg' width={150} height={150} />
                                    <h3 style={{ width: 400, color: 'rgb(200, 200, 200)' }}>Nu a fost găsită niciun comentariu semnalat ca fiind neadecvat</h3>
                                </div>
                            </div>
                        }
                    </>
                :
                    <div className={styles.loader}></div>
            }

            {coming &&
                <div className={styles.more}>
                    <button onClick={() => setMore(prev => prev + 15)}>Mai mult...</button>
                </div>
            } 
        </>
    )
}

export default ReportedPosts;

export const getServerSideProps: GetServerSideProps = async (ctx: any) => {
    const { req } = ctx;

    const token = req.cookies['Allow-Authorization']
    let redirect = false
  
    if(!token) {
        return {
            redirect: {
                destination: '/',
                permanent: false
            },
            props: {}
        }
    }
  
    const user = await axios.post(`${server}/api/sd/authentication/login-status`, {}, { withCredentials: true, headers: { Cookie: req.headers.cookie || 'a' } })
                        .then(res => res.data)
                        .catch(err => {
                            console.log(err);
                            redirect = true
                        })
  
    if(redirect)  {
        return {
            redirect: {
                permanent: false,
                destination: '/'
            },
            props: {}
        }
    }

    const result = await axios.get(`${server}/api/sd/post/get-reported-comments?level=all&skip=0`, { withCredentials: true, headers: { Cookie: req.headers.cookie || 'a' } })
                         .then(res => res.data)
                         .catch(err => {
                            console.log(err);
                            redirect = true
                        })

    if(redirect)  {
        return {    
            redirect: {
                permanent: false,
                destination: '/statistics'
            },
            props: {}
        }
    }

    return {
        props: {
            _comments: result.comments,
            _coming: result.coming
        }
    }
}