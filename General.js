
      document.addEventListener("DOMContentLoaded", function () {
    // Reference existing containers
    const header = document.getElementById("header");
    const opnNav = document.getElementById("opn-nav");
    const cancNav = document.getElementById("canc");
    const logo = document.getElementById("logo");
    const contactBtn = document.getElementById("btn");
    const sideNav = document.getElementById("sideNav");
    const sideOverlay = document.getElementById("sideC");
    const footer = document.getElementById("footer");

    // Create and append elements
    header.innerHTML = `<a href="activities.html"><b>Na'eem Everest</b></a>`;

    opnNav.innerHTML = "&#9776;";
    opnNav.onclick = openNav;

    cancNav.innerHTML = "&#9776;";
    cancNav.onclick = closeNav;

    logo.innerHTML = `<a href="activities.html"><img src="images/logo.png" alt="logo"></a>`;

    contactBtn.innerHTML = `<a href="contact.html"><img src="icon/contact1.png" alt="contact"></a>`;

    sideOverlay.onclick = closeNav;

    sideNav.innerHTML = `
        <div class="share-cont">
            <a href="https://api.whatsapp.com/send?text=weblink"><img class="share" src="icon/whatsapp1.png" alt="whatsapp"></a>
            <img id="gen_share" class="share" src="icon/share1.png" alt="share">
        </div>
        <div style="height: 40px;"></div>
    `;

    addNavLink(sideNav, "Home", "images/image2.png", "activities.html");
        // Products Dropdown
    const productsDetails = document.createElement("details");
    productsDetails.innerHTML = `<summary><img class="icon" src="images/image2.png"><l>Products</l></summary>`;
    
    addNavLink(productsDetails, "Courses", "images/image2.png", "p-courses.html");
    addNavLink(productsDetails, "Web Design", "images/image2.png", "p-web-design.html");
    addNavLink(productsDetails, "Softwares", "images/image2.png", "p-softwares.html");
    addNavLink(productsDetails, "Printing Service", "images/image2.png", "p-printing.html");
    addNavLink(productsDetails, "Graphic Design", "images/image2.png", "p-graphics.html");
    addNavLink(productsDetails, "Others", "images/image2.png", "others-blog.html");

    sideNav.appendChild(productsDetails);

    // Blogs Dropdown
    const blogDetails = document.createElement("details");
    blogDetails.innerHTML = `<summary><img class="icon" src="images/image2.png"><l>Blogs</l></summary>`;
    
    addNavLink(blogDetails, "Operating System", "images/image2.png", "os-blog.html");
    addNavLink(blogDetails, "Software", "images/image2.png", "software-blog.html");
    addNavLink(blogDetails, "Technology", "images/image2.png", "technology-blog.html");
    addNavLink(blogDetails, "Education", "images/image2.png", "education-blog.html");
    addNavLink(blogDetails, "Others", "images/image2.png", "others-blog.html");

    sideNav.appendChild(blogDetails);

    addNavLink(sideNav, "Affiliation", "images/image2.png", "affiliation.html");
   addNavLink(sideNav, "About", "images/image2.png", "about.html"); 
    addNavLink(sideNav, "Contact", "images/image2.png", "contact.html");
    addNavLink(sideNav, "Feedback", "images/image2.png", "https://google.com");

    sideNav.innerHTML += `<a href="https://powersoft1.blogspot.com"><img class="pwsft" src="icon/powersoft.png" alt="Developed by PowerSoft"></a>`;

    // Footer
    footer.innerHTML = `
        <div class="footer-container">
            <br>
            <nav>
                    <a href="activities.html">Home</a>
                    <a href="activities.html">Activities</a>
                    <a href="about.html">About</a>
                    <a href="contact.html">Contact</a>
            </nav>
            <p class="footer-text">© ${new Date().getFullYear()} | Na'eem Everest. All Rights Reserved.</p>
            <div class="footer-logo">
                <a href="https://powersoft1.blogspot.com">
                <img src="icon/powersoft.png" alt="developed by powersoft">
                </a>
                </div>
                
                <a class="privacy" href="Privacy.html">
                  Privacy Policy
                </a>
        </div>
    `;

    // Sidebar menu functions
    function openNav() {
        sideNav.style.height = "60%";
        sideOverlay.style.display = "block";
        opnNav.style.display = "none";
        cancNav.style.display = "block";
    }

    function closeNav() {
        sideNav.style.height = "0%";
        sideOverlay.style.display = "none";
        opnNav.style.display = "block";
        cancNav.style.display = "none";
    }

    // Share functionality
    document.getElementById("gen_share").addEventListener("click", async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: "Amazing Content",
                    text: "Check out this amazing content!",
                    url: "https://example.com",
                });
                console.log("Content shared successfully!");
            } catch (error) {
                console.error("Error sharing:", error);
            }
        } else {
            alert("Sharing is not supported on this browser.");
        }
    });

    function addNavLink(parent, text, iconSrc, href) {
        const link = document.createElement("a");
        link.href = href;
        link.innerHTML = `<p><img class="icon" src="${iconSrc}"><l>${text}</l></p>`;
        parent.appendChild(link);
    }
});

// Search..........
   
    document.getElementById('searchBox1').addEventListener('keyup', function() {
        let filter = this.value.toLowerCase();
        let items = document.querySelectorAll('.card');
        let found = false;

        items.forEach(item => {
            if (item.innerText.toLowerCase().includes(filter)) {
                item.style.display = 'block';
                found = true;
            } else {
                item.style.display = 'none';
            }
        });

        document.getElementById('noResult1').style.display = found ? 'none' : 'block';
    });
    